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

        const orderNum = `FL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        const createdOrder = await prisma.order.create({
          data: {
            orderNumber: orderNum,
            clientId: body.clientId || 'user-client-1',
            clientName: body.clientName,
            clientPhone: body.clientPhone,
            clientEmail: body.clientEmail,
            vendorId: vendor.id,
            totalAmount: Math.round(calculatedTotal * 100) / 100,
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
