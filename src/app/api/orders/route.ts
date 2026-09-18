import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') || undefined;
  const clientEmail = searchParams.get('clientEmail') || undefined;
  const vendorId = searchParams.get('vendorId') || undefined;

  try {
    const andClauses: Prisma.OrderWhereInput[] = [];

    if (clientId && clientId !== 'ALL') {
      const isDefaultDemoClient = clientId === 'user-client-1' || clientId.includes('client');
      
      const userOrConditions: Prisma.UserWhereInput[] = [
        { id: clientId },
        { email: { equals: clientId, mode: 'insensitive' } },
      ];

      if (clientEmail) {
        userOrConditions.push({ email: { equals: clientEmail, mode: 'insensitive' } });
      }

      if (isDefaultDemoClient) {
        userOrConditions.push({ role: 'CLIENT' });
        userOrConditions.push({ email: { contains: 'maria', mode: 'insensitive' } });
        userOrConditions.push({ email: { contains: 'cliente', mode: 'insensitive' } });
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

      if (isDefaultDemoClient) {
        clientOrConditions.push({ clientEmail: { contains: 'maria', mode: 'insensitive' } });
        clientOrConditions.push({ clientEmail: { contains: 'cliente', mode: 'insensitive' } });
      }

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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const vendorWhereConditions: Prisma.VendorWhereInput[] = [
      { id: body.vendorId },
      { slug: body.vendorId },
      { userId: body.vendorId },
    ];
    if (body.vendorName) {
      vendorWhereConditions.push({ businessName: { equals: body.vendorName, mode: 'insensitive' } });
    }

    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: vendorWhereConditions,
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Feirante não encontrado no banco de dados.' }, { status: 404 });
    }

    // Validate items and calculate total
    let calculatedTotal = 0;
    const itemsToCreate = [];

    for (const it of body.items) {
      const product = it.productId
        ? await prisma.product.findFirst({
            where: {
              id: it.productId,
              vendorId: vendor.id,
            },
          })
        : it.productName
        ? await prisma.product.findFirst({
            where: {
              vendorId: vendor.id,
              name: { equals: it.productName, mode: 'insensitive' },
            },
          })
        : null;

      if (!product) {
        return NextResponse.json({
          error: `Produto não encontrado no catálogo desta barraca.`,
        }, { status: 404 });
      }

      if (product.stock < it.quantity) {
        return NextResponse.json({
          error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`,
        }, { status: 400 });
      }

      const subtotal = Math.round((product.price * it.quantity) * 100) / 100;
      calculatedTotal = Math.round((calculatedTotal + subtotal) * 100) / 100;
      itemsToCreate.push({
        productId: product.id,
        productName: product.name,
        productUnit: product.unit,
        unitPrice: product.price,
        quantity: it.quantity,
        subtotal,
      });

      // Decrement stock in DB
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: it.quantity } },
      });
    }

    // Validate coupon if provided
    let discountAmount = 0;
    let finalTotal = Math.round(calculatedTotal * 100) / 100;
    let appliedCouponCode: string | null = null;

    if (body.couponCode) {
      const formattedCode = body.couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({ where: { code: formattedCode } });

      if (!coupon || !coupon.active) {
        return NextResponse.json({ error: 'Cupom inválido ou inativo.' }, { status: 400 });
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Este cupom está expirado.' }, { status: 400 });
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ error: 'Este cupom já atingiu o limite de utilizações.' }, { status: 400 });
      }
      if (calculatedTotal < coupon.minOrderValue) {
        return NextResponse.json({
          error: `O valor mínimo para utilizar este cupom é de R$ ${coupon.minOrderValue.toFixed(2).replace('.', ',')}.`,
        }, { status: 400 });
      }
      if (coupon.vendorId && coupon.vendorId !== vendor.id) {
        return NextResponse.json({ error: 'Este cupom é exclusivo para outra banca.' }, { status: 400 });
      }

      appliedCouponCode = coupon.code;
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = Math.round((calculatedTotal * (coupon.discountValue / 100)) * 100) / 100;
      } else {
        discountAmount = Math.min(calculatedTotal, coupon.discountValue);
      }
      finalTotal = Math.max(0, Math.round((calculatedTotal - discountAmount) * 100) / 100);

      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    const orderNum = `FL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Resolve client user in DB so FK relation is always valid
    let dbClientId = body.clientId;
    const existingClient = await prisma.user.findFirst({
      where: {
        OR: [
          { id: body.clientId },
          { email: (body.clientEmail || '').trim().toLowerCase() },
        ],
      },
    });

    if (existingClient) {
      dbClientId = existingClient.id;
    } else {
      try {
        const cleanMail = (body.clientEmail || `cliente-${Date.now()}@feirae.com`).trim().toLowerCase();
        const newClient = await prisma.user.create({
          data: {
            name: body.clientName || 'Cliente Consumidor',
            email: cleanMail,
            phone: body.clientPhone || null,
            role: 'CLIENT',
          },
        });
        dbClientId = newClient.id;
      } catch {
        const firstClient = await prisma.user.findFirst({ where: { role: 'CLIENT' } });
        if (firstClient) dbClientId = firstClient.id;
      }
    }

    const createdOrder = await prisma.order.create({
      data: {
        orderNumber: orderNum,
        clientId: dbClientId,
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        clientEmail: body.clientEmail,
        vendorId: vendor.id,
        totalAmount: finalTotal,
        couponCode: appliedCouponCode,
        discountAmount: discountAmount,
        originalAmount: Math.round(calculatedTotal * 100) / 100,
        status: 'NOVO',
        paymentMethod: body.paymentMethod || 'RETIRADA',
        paymentStatus: body.paymentMethod === 'RETIRADA' ? 'PAGO_NA_RETIRADA' : 'PENDENTE',
        pickupDate: body.pickupDate,
        pickupLocation: body.pickupLocation,
        notes: body.notes || null,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: true,
        vendor: { select: { businessName: true } },
        review: true,
      },
    });

    // Create Notifications
    await prisma.notification.create({
      data: {
        userId: vendor.userId,
        title: 'Novo Pré-pedido Recebido!',
        message: `${body.clientName} realizou o pedido #${orderNum} no valor de R$ ${finalTotal.toFixed(2)}.`,
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
    console.error('Error in POST /api/orders:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao processar pré-pedido no banco de dados.' }, { status: 500 });
  }
}
