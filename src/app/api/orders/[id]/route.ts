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
    const { status, itemId, measuredWeight, items } = body;

    // 1. Try Prisma Neon
    try {
      const existingOrder = await prisma.order.findFirst({
        where: { OR: [{ id: params.id }, { orderNumber: params.id }] },
        include: { items: true, vendor: true },
      });

      if (existingOrder) {
        // A. Handle item measured weight update
        if (itemId && measuredWeight !== undefined) {
          const itemToUpdate = existingOrder.items.find(it => it.id === itemId);
          if (itemToUpdate) {
            const weight = Number(measuredWeight);
            const itemSubtotal = Number((itemToUpdate.unitPrice * weight).toFixed(2));
            await prisma.orderItem.update({
              where: { id: itemId },
              data: { measuredWeight: weight, subtotal: itemSubtotal },
            });

            // Recalculate total amount
            const allItems = await prisma.orderItem.findMany({ where: { orderId: existingOrder.id } });
            const sumSubtotals = allItems.reduce((acc, it) => acc + it.subtotal, 0);
            const discount = existingOrder.discountAmount || 0;
            const newTotal = Math.max(0, Number((sumSubtotals - discount).toFixed(2)));

            await prisma.order.update({
              where: { id: existingOrder.id },
              data: { totalAmount: newTotal },
            });

            store.updateOrderItemWeight(params.id, itemId, weight);
          }
        } else if (Array.isArray(items)) {
          for (const it of items) {
            if (it.id && it.measuredWeight !== undefined) {
              const existingItem = existingOrder.items.find(i => i.id === it.id);
              if (existingItem) {
                const weight = Number(it.measuredWeight);
                const itemSubtotal = Number((existingItem.unitPrice * weight).toFixed(2));
                await prisma.orderItem.update({
                  where: { id: it.id },
                  data: { measuredWeight: weight, subtotal: itemSubtotal },
                });
                store.updateOrderItemWeight(params.id, it.id, weight);
              }
            }
          }
          const allItems = await prisma.orderItem.findMany({ where: { orderId: existingOrder.id } });
          const sumSubtotals = allItems.reduce((acc, it) => acc + it.subtotal, 0);
          const discount = existingOrder.discountAmount || 0;
          const newTotal = Math.max(0, Number((sumSubtotals - discount).toFixed(2)));

          await prisma.order.update({
            where: { id: existingOrder.id },
            data: { totalAmount: newTotal },
          });
        }

        // B. Handle status update if provided
        if (status) {
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

          await prisma.order.update({
            where: { id: existingOrder.id },
            data: { status: status as OrderStatus },
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

          store.updateOrderStatus(params.id, status);
        }

        const freshOrder = await prisma.order.findUnique({
          where: { id: existingOrder.id },
          include: { items: true, vendor: true },
        });

        return NextResponse.json({
          ...freshOrder,
          vendorName: freshOrder?.vendor?.businessName,
        });
      }
    } catch (dbErr) {
      console.warn('Prisma patch order fallback:', dbErr);
    }

    // 2. Fallback to store
    if (itemId && measuredWeight !== undefined) {
      store.updateOrderItemWeight(params.id, itemId, Number(measuredWeight));
    } else if (Array.isArray(items)) {
      for (const it of items) {
        if (it.id && it.measuredWeight !== undefined) {
          store.updateOrderItemWeight(params.id, it.id, Number(it.measuredWeight));
        }
      }
    }

    if (status) {
      store.updateOrderStatus(params.id, status);
    }

    const updated = store.getOrderById(params.id);
    if (!updated) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Error in PATCH /api/orders/[id]:', err);
    return NextResponse.json({ error: 'Erro ao atualizar pedido.' }, { status: 500 });
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
