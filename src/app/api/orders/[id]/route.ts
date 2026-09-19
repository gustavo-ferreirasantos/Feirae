import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cleanId = String(params.id).trim();
    const withoutHash = cleanId.replace('#', '');

    const dbOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { id: withoutHash },
          { orderNumber: cleanId },
          { orderNumber: withoutHash },
          { orderNumber: `#${withoutHash}` },
        ],
      },
      include: {
        items: true,
        vendor: { 
          select: { 
            id: true, 
            businessName: true, 
            fairLocation: true, 
            whatsappPhone: true,
            user: { select: { phone: true, whatsappPhone: true } }
          } 
        },
        client: { select: { id: true, name: true, phone: true, email: true } },
        review: true,
      },
    });

    if (!dbOrder) {
      return NextResponse.json({ error: 'Pedido não encontrado no banco de dados.' }, { status: 404 });
    }

    const vendorPhone = dbOrder.vendor?.whatsappPhone || dbOrder.vendor?.user?.whatsappPhone || dbOrder.vendor?.user?.phone || undefined;

    return NextResponse.json({
      ...dbOrder,
      vendorName: dbOrder.vendor?.businessName,
      vendorPhone,
      vendor: dbOrder.vendor ? {
        id: dbOrder.vendor.id,
        businessName: dbOrder.vendor.businessName,
        fairLocation: dbOrder.vendor.fairLocation,
        whatsappPhone: vendorPhone,
      } : undefined,
      createdAt: dbOrder.createdAt.toISOString ? dbOrder.createdAt.toISOString() : String(dbOrder.createdAt),
      review: dbOrder.review
        ? {
            ...dbOrder.review,
            createdAt: dbOrder.review.createdAt.toISOString ? dbOrder.review.createdAt.toISOString() : String(dbOrder.review.createdAt),
          }
        : null,
    });
  } catch (err: any) {
    console.error('Error in GET /api/orders/[id]:', err);
    return NextResponse.json({ error: 'Erro ao buscar pedido no banco de dados.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cleanId = String(params.id).trim();
    const withoutHash = cleanId.replace('#', '');

    const body = await request.json();
    const { status, itemId, measuredWeight, items } = body;

    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { id: withoutHash },
          { orderNumber: cleanId },
          { orderNumber: withoutHash },
          { orderNumber: `#${withoutHash}` },
        ],
      },
      include: { items: true, vendor: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pedido não encontrado no banco de dados.' }, { status: 404 });
    }

    const ALLOWED_NEXT: Record<string, string[]> = {
      NOVO: ['EM_PREPARO', 'CANCELADO'],
      EM_PREPARO: ['PRONTO', 'CANCELADO'],
      PRONTO: ['RETIRADO', 'CANCELADO'],
      RETIRADO: [],
      CANCELADO: [],
    };

    if (status !== undefined && status !== null) {
      if (!Object.prototype.hasOwnProperty.call(ALLOWED_NEXT, status)) {
        return NextResponse.json({ error: 'Status de pedido inválido.' }, { status: 400 });
      }
      if (status !== existingOrder.status && !ALLOWED_NEXT[existingOrder.status].includes(status)) {
        return NextResponse.json(
          { error: `Não é possível mover o pedido de ${existingOrder.status} para ${status}.` },
          { status: 400 }
        );
      }
    }

    const weightsToCheck: unknown[] = [];
    if (itemId && measuredWeight !== undefined) weightsToCheck.push(measuredWeight);
    if (Array.isArray(items)) items.forEach((it: any) => it?.measuredWeight !== undefined && weightsToCheck.push(it.measuredWeight));
    if (weightsToCheck.some(w => !Number.isFinite(Number(w)) || Number(w) < 0)) {
      return NextResponse.json({ error: 'Peso medido inválido: informe um número maior ou igual a zero.' }, { status: 400 });
    }

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
    if (status && status !== existingOrder.status) {
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
      const statusLabel =
        status === 'EM_PREPARO'
          ? 'Em Preparo'
          : status === 'PRONTO'
          ? 'Pronto para Retirada'
          : status === 'RETIRADO'
          ? 'Entregue / Concluído'
          : 'Cancelado';

      await prisma.notification.create({
        data: {
          userId: existingOrder.clientId,
          title: `Pedido ${existingOrder.orderNumber} Atualizado`,
          message: `Status atual: ${statusLabel} na barraca ${existingOrder.vendor.businessName}.`,
          type: 'ORDER_STATUS',
          orderId: existingOrder.id,
        },
      }).catch(() => {});
    }

    const freshOrder = await prisma.order.findUnique({
      where: { id: existingOrder.id },
      include: {
        items: true,
        vendor: { 
          select: { 
            id: true, 
            businessName: true, 
            fairLocation: true, 
            whatsappPhone: true,
            user: { select: { phone: true, whatsappPhone: true } }
          } 
        },
        client: { select: { id: true, name: true, phone: true, email: true } },
        review: true,
      },
    });

    const vendorPhone = freshOrder?.vendor?.whatsappPhone || freshOrder?.vendor?.user?.whatsappPhone || freshOrder?.vendor?.user?.phone || undefined;

    return NextResponse.json({
      ...freshOrder,
      vendorName: freshOrder?.vendor?.businessName,
      vendorPhone,
      vendor: freshOrder?.vendor ? {
        id: freshOrder.vendor.id,
        businessName: freshOrder.vendor.businessName,
        fairLocation: freshOrder.vendor.fairLocation,
        whatsappPhone: vendorPhone,
      } : undefined,
      createdAt: freshOrder?.createdAt.toISOString ? freshOrder.createdAt.toISOString() : String(freshOrder?.createdAt),
      review: freshOrder?.review
        ? {
            ...freshOrder.review,
            createdAt: freshOrder.review.createdAt.toISOString ? freshOrder.review.createdAt.toISOString() : String(freshOrder.review.createdAt),
          }
        : null,
    });
  } catch (err: any) {
    console.error('Error in PATCH /api/orders/[id]:', err);
    return NextResponse.json({ error: 'Erro ao atualizar pedido no banco de dados.' }, { status: 500 });
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

    const cleanId = String(params.id).trim();
    const withoutHash = cleanId.replace('#', '');

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: cleanId, clientId },
          { id: withoutHash, clientId },
          { orderNumber: cleanId, clientId },
          { orderNumber: withoutHash, clientId },
        ],
      },
      include: { items: true, vendor: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado ou você não tem permissão para cancelá-lo.' }, { status: 404 });
    }

    if (order.status !== 'NOVO' && order.status !== 'EM_PREPARO') {
      return NextResponse.json({ error: 'Não é possível cancelar um pedido que já está pronto ou retirado.' }, { status: 400 });
    }

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

    // Notify vendor about the cancellation
    if (order.vendor?.userId) {
      await prisma.notification.create({
        data: {
          userId: order.vendor.userId,
          title: `Pedido ${order.orderNumber} Cancelado`,
          message: `O cliente cancelou o pedido #${order.orderNumber}. Os itens foram devolvidos ao estoque.`,
          type: 'ORDER_STATUS',
          orderId: order.id,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Pedido cancelado e estoque estornado com sucesso.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/orders/[id]:', err);
    return NextResponse.json({ error: 'Erro ao cancelar pedido no banco de dados.' }, { status: 500 });
  }
}
