import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') || undefined;
  const vendorId = searchParams.get('vendorId') || undefined;

  try {
    const whereClause: any = {};
    if (clientId) whereClause.clientId = clientId;
    if (vendorId) {
      whereClause.OR = [
        { vendorId: vendorId },
        { vendor: { slug: vendorId } },
        { vendor: { userId: vendorId } },
      ];
    }

    const dbOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
        vendor: { select: { businessName: true, fairLocation: true, category: true } },
        client: { select: { name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (dbOrders && dbOrders.length > 0) {
      return NextResponse.json(
        dbOrders.map(o => ({
          ...o,
          vendorName: o.vendor?.businessName,
          items: o.items,
        }))
      );
    }
  } catch (err) {
    console.warn('Prisma get orders fallback to store:', err);
  }

  const orders = store.getOrders({ clientId, vendorId });
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Try Prisma Neon Transaction
    try {
      // Find or verify vendor
      const vendor = await prisma.vendor.findFirst({
        where: { OR: [{ id: body.vendorId }, { slug: body.vendorId }] },
      });

      if (vendor) {
        // Validate items and calculate total
        let calculatedTotal = 0;
        const itemsToCreate = [];

        for (const it of body.items) {
          const product = await prisma.product.findUnique({ where: { id: it.productId } });
          if (!product) throw new Error(`Produto não encontrado.`);
          if (product.stock < it.quantity) {
            return NextResponse.json({
              error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`,
            }, { status: 400 });
          }

          const subtotal = product.price * it.quantity;
          calculatedTotal += subtotal;
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

        const createdOrder = await prisma.order.create({
          data: {
            orderNumber: orderNum,
            clientId: body.clientId || 'user-client-1',
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
          },
        });

        // Create Notifications
        await prisma.notification.create({
          data: {
            userId: vendor.userId,
            title: 'Novo Pré-pedido Recebido!',
            message: `${body.clientName} realizou o pedido #${orderNum} no valor de R$ ${calculatedTotal.toFixed(2)}.`,
            type: 'NEW_ORDER',
            orderId: createdOrder.id,
          },
        });

        // Also sync local store
        store.createOrder(body);

        return NextResponse.json({
          ...createdOrder,
          vendorName: createdOrder.vendor?.businessName,
        }, { status: 201 });
      }
    } catch (dbErr) {
      console.warn('Prisma create order fallback to store:', dbErr);
    }

    // 2. Fallback to store
    const result = store.createOrder(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.order, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao processar pré-pedido.' }, { status: 500 });
  }
}
