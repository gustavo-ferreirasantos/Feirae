import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { randomInt } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') || undefined;
  const clientEmail = searchParams.get('clientEmail') || undefined;
  const vendorId = searchParams.get('vendorId') || undefined;

  try {
    const andClauses: Prisma.OrderWhereInput[] = [];

    if (clientId && clientId !== 'ALL') {
      const userOrConditions: Prisma.UserWhereInput[] = [
        { id: clientId },
        { email: { equals: clientId, mode: 'insensitive' } },
      ];

      if (clientEmail) {
        userOrConditions.push({ email: { equals: clientEmail, mode: 'insensitive' } });
      }

      const matchingUsers = await prisma.user.findMany({
        where: {
          OR: userOrConditions,
        },
        select: { id: true, email: true },
      }).catch(() => []);

      const clientIds = Array.from(new Set([clientId, ...matchingUsers.map(u => u.id)]));
      const clientEmails = Array.from(new Set([...(clientEmail ? [clientEmail] : []), ...matchingUsers.map(u => u.email).filter(Boolean)]));

      const clientOrConditions: Prisma.OrderWhereInput[] = [
        { clientId: { in: clientIds } },
        ...(clientEmails.length > 0 ? [{ clientEmail: { in: clientEmails } }] : []),
      ];

      andClauses.push({ OR: clientOrConditions });
    }

    if (vendorId && vendorId !== 'ALL') {
      const matchingVendors = await prisma.vendor.findMany({
        where: {
          OR: [
            { id: vendorId },
            { slug: vendorId },
            { userId: vendorId },
          ],
        },
        select: { id: true, userId: true },
      }).catch(() => []);

      const vendorIds = Array.from(new Set([vendorId, ...matchingVendors.map(v => v.id), ...matchingVendors.map(v => v.userId)]));

      andClauses.push({
        OR: [
          { vendorId: { in: vendorIds } },
          { vendor: { id: { in: vendorIds } } },
          { vendor: { userId: { in: vendorIds } } },
          { vendor: { slug: vendorId } },
        ],
      });
    }

    const whereClause: Prisma.OrderWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};

    const fetchedDbOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
        vendor: { select: { id: true, businessName: true, fairLocation: true, category: true, slug: true, userId: true } },
        client: { select: { id: true, name: true, phone: true, email: true } },
        review: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = fetchedDbOrders.map(o => ({
      ...o,
      createdAt: o.createdAt.toISOString ? o.createdAt.toISOString() : String(o.createdAt),
      vendorName: o.vendor?.businessName,
      items: o.items,
      review: o.review ? {
        ...o.review,
        createdAt: o.review.createdAt.toISOString ? o.review.createdAt.toISOString() : String(o.review.createdAt),
        vendorReplyAt: o.review.vendorReplyAt?.toISOString ? o.review.vendorReplyAt.toISOString() : o.review.vendorReplyAt,
      } : undefined,
    }));

    return NextResponse.json(formattedOrders);
  } catch (err: any) {
    console.error('Prisma get orders error:', err);
    return NextResponse.json({ error: 'Erro ao buscar pedidos do banco de dados.' }, { status: 500 });
  }
}

class OrderInputError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const PAYMENT_METHODS = ['RETIRADA', 'MERCADO_PAGO_PIX', 'MERCADO_PAGO_CARTAO'] as const;

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `FE-${year}-${randomInt(100000, 1000000)}`;
    const taken = await prisma.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  throw new OrderInputError('Não foi possível gerar o número do pedido. Tente novamente.', 503);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const requestedItems: { productId?: string; productName?: string; quantity: number }[] = Array.isArray(body.items)
      ? body.items
      : [];
    if (requestedItems.length === 0) {
      throw new OrderInputError('O pedido precisa ter pelo menos um item.');
    }

    const paymentMethod = body.paymentMethod || 'RETIRADA';
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new OrderInputError('Forma de pagamento inválida.');
    }

    const vendorWhereConditions: Prisma.VendorWhereInput[] = [
      { id: body.vendorId },
      { slug: body.vendorId },
      { userId: body.vendorId },
    ];
    if (body.vendorName) {
      vendorWhereConditions.push({ businessName: { equals: body.vendorName, mode: 'insensitive' } });
    }

    const vendor = await prisma.vendor.findFirst({ where: { OR: vendorWhereConditions } });
    if (!vendor) {
      throw new OrderInputError('Feirante não encontrado no banco de dados.', 404);
    }
    if (!vendor.active) {
      throw new OrderInputError('Esta barraca não está aceitando pedidos no momento.');
    }

    // Resolve client user so the FK relation is always valid
    const cleanEmail = (body.clientEmail || '').trim().toLowerCase();
    const clientLookup: Prisma.UserWhereInput[] = [];
    if (body.clientId) clientLookup.push({ id: body.clientId });
    if (cleanEmail) clientLookup.push({ email: cleanEmail });
    const existingClient = clientLookup.length > 0
      ? await prisma.user.findFirst({ where: { OR: clientLookup } })
      : null;

    let dbClientId: string;
    if (existingClient) {
      dbClientId = existingClient.id;
    } else {
      const newClient = await prisma.user.create({
        data: {
          name: body.clientName || 'Cliente Consumidor',
          email: cleanEmail || `cliente-${Date.now()}@feirae.com`,
          phone: body.clientPhone || null,
          role: 'CLIENT',
        },
      }).catch(() => {
        throw new OrderInputError('Não foi possível identificar o cliente do pedido.');
      });
      dbClientId = newClient.id;
    }

    const orderNum = await generateOrderNumber();

    const createdOrder = await prisma.$transaction(async (tx) => {
      let calculatedTotal = 0;
      const itemsToCreate: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];

      for (const it of requestedItems) {
        const quantity = Number(it.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new OrderInputError('Quantidade inválida: informe um valor maior que zero.');
        }
        if (!Number.isInteger(quantity)) {
          throw new OrderInputError('Quantidade fracionada ainda não é suportada pelo banco de dados. Use quantidades inteiras.');
        }

        const product = await tx.product.findFirst({
          where: {
            OR: [
              { id: it.productId },
              ...(it.productName ? [{ vendorId: vendor.id, name: { equals: it.productName, mode: 'insensitive' as const } }] : []),
            ],
          },
        });

        if (!product || product.vendorId !== vendor.id || !product.isActive) {
          throw new OrderInputError('Produto não encontrado ou indisponível nesta barraca.', 404);
        }

        // Conditional decrement: only succeeds while enough stock remains (safe under concurrent orders)
        const reserved = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (reserved.count === 0) {
          const fresh = await tx.product.findUnique({ where: { id: product.id }, select: { stock: true } });
          throw new OrderInputError(`Estoque insuficiente para "${product.name}". Disponível: ${fresh?.stock ?? 0}`);
        }

        const subtotal = Math.round(product.price * quantity * 100) / 100;
        calculatedTotal = Math.round((calculatedTotal + subtotal) * 100) / 100;
        itemsToCreate.push({
          productId: product.id,
          productName: product.name,
          productUnit: product.unit,
          unitPrice: product.price,
          quantity,
          subtotal,
        });
      }

      let discountAmount = 0;
      let finalTotal = calculatedTotal;
      let appliedCouponCode: string | null = null;

      if (body.couponCode) {
        const formattedCode = String(body.couponCode).trim().toUpperCase();
        const coupon = await tx.coupon.findUnique({ where: { code: formattedCode } });

        if (!coupon || !coupon.active) throw new OrderInputError('Cupom inválido ou inativo.');
        if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
          throw new OrderInputError('Este cupom está expirado.');
        }
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
          throw new OrderInputError('Este cupom já atingiu o limite de utilizações.');
        }
        if (calculatedTotal < coupon.minOrderValue) {
          throw new OrderInputError(
            `O valor mínimo para utilizar este cupom é de R$ ${coupon.minOrderValue.toFixed(2).replace('.', ',')}.`
          );
        }
        if (coupon.vendorId && coupon.vendorId !== vendor.id) {
          throw new OrderInputError('Este cupom é exclusivo para outra banca.');
        }

        const consumed = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            active: true,
            ...(coupon.maxUses !== null && { usedCount: { lt: coupon.maxUses } }),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (consumed.count === 0) throw new OrderInputError('Este cupom já atingiu o limite de utilizações.');

        appliedCouponCode = coupon.code;
        discountAmount = coupon.discountType === 'PERCENTAGE'
          ? Math.round(calculatedTotal * (coupon.discountValue / 100) * 100) / 100
          : Math.min(calculatedTotal, coupon.discountValue);
        finalTotal = Math.max(0, Math.round((calculatedTotal - discountAmount) * 100) / 100);
      }

      return tx.order.create({
        data: {
          orderNumber: orderNum,
          clientId: dbClientId,
          clientName: body.clientName,
          clientPhone: body.clientPhone,
          clientEmail: body.clientEmail,
          vendorId: vendor.id,
          totalAmount: finalTotal,
          couponCode: appliedCouponCode,
          discountAmount,
          originalAmount: calculatedTotal,
          status: 'NOVO',
          paymentMethod,
          paymentStatus: paymentMethod === 'RETIRADA' ? 'PAGO_NA_RETIRADA' : 'PENDENTE',
          pickupDate: body.pickupDate,
          pickupLocation: body.pickupLocation,
          notes: body.notes || null,
          items: { create: itemsToCreate },
        },
        include: {
          items: true,
          vendor: { select: { businessName: true } },
          review: true,
        },
      });
    }, { maxWait: 10000, timeout: 20000 });

    await prisma.notification.create({
      data: {
        userId: vendor.userId,
        title: 'Novo Pré-pedido Recebido!',
        message: `${body.clientName} realizou o pedido #${orderNum} no valor de R$ ${createdOrder.totalAmount.toFixed(2)}.`,
        type: 'NEW_ORDER',
        orderId: createdOrder.id,
      },
    }).catch(() => {});

    return NextResponse.json({
      ...createdOrder,
      createdAt: createdOrder.createdAt.toISOString(),
      vendorName: createdOrder.vendor?.businessName,
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof OrderInputError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Error in POST /api/orders:', err);
    return NextResponse.json({ error: 'Erro ao processar pré-pedido no banco de dados.' }, { status: 500 });
  }
}
