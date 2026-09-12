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
            message: `${body.clientName} realizou o pedido #${orderNum} no valor de R$ ${finalTotal.toFixed(2)}.`,
            type: 'NEW_ORDER',
            orderId: createdOrder.id,
          },
        });

        // Also sync local store with the created DB order
        store.orders.unshift({
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          clientId: createdOrder.clientId,
          clientName: createdOrder.clientName,
          clientPhone: createdOrder.clientPhone || '',
          clientEmail: createdOrder.clientEmail || '',
          vendorId: createdOrder.vendorId,
          vendorName: createdOrder.vendor?.businessName ?? undefined,
          totalAmount: createdOrder.totalAmount,
          couponCode: createdOrder.couponCode || undefined,
          discountAmount: createdOrder.discountAmount ?? 0,
          originalAmount: createdOrder.originalAmount || undefined,
          status: createdOrder.status as any,
          paymentMethod: createdOrder.paymentMethod as any,
          paymentStatus: createdOrder.paymentStatus as any,
          pickupDate: createdOrder.pickupDate,
          pickupLocation: createdOrder.pickupLocation,
          notes: createdOrder.notes || undefined,
          createdAt: createdOrder.createdAt.toISOString(),
          items: createdOrder.items.map(i => ({
            id: i.id,
            orderId: i.orderId,
            productId: i.productId,
            productName: i.productName,
            productUnit: i.productUnit,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            subtotal: i.subtotal,
            measuredWeight: i.measuredWeight || undefined,
          })),
        });

        // Decrement local store product stock
        for (const it of body.items) {
          const stProd = store.getProductById(it.productId);
          if (stProd) {
            stProd.stock = Number(Math.max(0, stProd.stock - it.quantity).toFixed(3));
          }
        }

        // Add local notifications for consistency
        store.addNotification({
          userId: vendor.userId,
          title: 'Novo Pré-pedido Recebido!',
          message: `${body.clientName} realizou o pedido #${orderNum} no valor de R$ ${finalTotal.toFixed(2)}.`,
          type: 'NEW_ORDER',
          orderId: createdOrder.id,
        });

        store.addNotification({
          userId: createdOrder.clientId,
          title: 'Pré-pedido Confirmado!',
          message: `Seu pedido #${orderNum} foi enviado para ${createdOrder.vendor?.businessName || 'a banca'}. Retirada: ${createdOrder.pickupDate}.`,
          type: 'ORDER_STATUS',
          orderId: createdOrder.id,
        });

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
