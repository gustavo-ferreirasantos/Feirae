import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';
import { OrderStatus } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dbOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: params.id }, { orderNumber: params.id }],
      },
      include: {
        items: true,
        vendor: { select: { businessName: true, fairLocation: true } },
        client: { select: { name: true, phone: true } },
      },
    });

    if (dbOrder) {
      return NextResponse.json({
        ...dbOrder,
        vendorName: dbOrder.vendor?.businessName,
      });
    }
  } catch (err) {
    console.warn('Prisma get order by id fallback:', err);
  }

  const order = store.getOrderById(params.id);
  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }
  return NextResponse.json(order);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    // 1. Try Prisma Neon
    try {
      const existingOrder = await prisma.order.findFirst({
        where: { OR: [{ id: params.id }, { orderNumber: params.id }] },
        include: { items: true, vendor: true },
      });

      if (existingOrder) {
        const isNowCancelled = status === 'CANCELADO' && existingOrder.status !== 'CANCELADO';

        if (isNowCancelled) {
          // Restore stock for cancelled order items
          for (const it of existingOrder.items) {
            await prisma.product.update({
              where: { id: it.productId },
              data: { stock: { increment: it.quantity } },
            }).catch(() => {});
          }
        }

        const updatedOrder = await prisma.order.update({
          where: { id: existingOrder.id },
          data: { status: status as OrderStatus },
          include: { items: true, vendor: true },
        });

        // Notify client about status update
        const statusLabel = status === 'EM_PREPARO' ? 'Em Preparo' : status === 'PRONTO' ? 'Pronto para Retirada' : status === 'RETIRADO' ? 'Entregue / Concluído' : 'Cancelado';
        await prisma.notification.create({
          data: {
            userId: existingOrder.clientId,
            title: `Pedido ${existingOrder.orderNumber} Atualizado`,
            message: `Status atual: ${statusLabel} na barraca ${existingOrder.vendor.businessName}.`,
            type: 'ORDER_STATUS',
            orderId: existingOrder.id,
          },
        }).catch(() => {});

        // Keep local store in sync
        store.updateOrderStatus(params.id, status);

        return NextResponse.json({
          ...updatedOrder,
          vendorName: updatedOrder.vendor?.businessName,
        });
      }
    } catch (dbErr) {
      console.warn('Prisma patch order fallback:', dbErr);
    }

    // 2. Fallback to store
    const updated = store.updateOrderStatus(params.id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar status do pedido.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ error: 'Identificação de cliente obrigatória.' }, { status: 400 });
    }

    try {
      const order = await prisma.order.findFirst({
        where: { id: params.id, clientId },
        include: { items: true },
      });

      if (order && order.status === 'NOVO') {
        for (const it of order.items) {
          await prisma.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
          }).catch(() => {});
        }

        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELADO' },
        });

        store.cancelOrder(params.id, clientId);
        return NextResponse.json({ success: true, message: 'Pedido cancelado e estoque estornado com sucesso.' });
      }
    } catch (dbErr) {
      console.warn('Prisma delete order fallback:', dbErr);
    }

    const result = store.cancelOrder(params.id, clientId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Pedido cancelado e estoque estornado com sucesso.' });
  } catch {
    return NextResponse.json({ error: 'Erro ao cancelar pedido.' }, { status: 500 });
  }
}
