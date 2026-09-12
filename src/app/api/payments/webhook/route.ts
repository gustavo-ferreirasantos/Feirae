import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, mpPaymentId, status } = body;

    const paymentStatus = status === 'approved' ? 'SIMULADO_APROVADO' : 'PENDENTE';

    // 1. Try Prisma DB update
    try {
      const dbOrder = await prisma.order.findFirst({
        where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
        include: { vendor: true },
      });

      if (dbOrder) {
        await prisma.order.update({
          where: { id: dbOrder.id },
          data: {
            paymentStatus: paymentStatus as any,
            mpPaymentId: mpPaymentId || null,
          },
        });

        if (status === 'approved') {
          await prisma.notification.create({
            data: {
              userId: dbOrder.clientId,
              title: 'Pagamento Mercado Pago Aprovado (Sandbox)',
              message: `O pagamento do seu pedido #${dbOrder.orderNumber} foi confirmado com sucesso via Mercado Pago.`,
              type: 'ORDER_STATUS',
              orderId: dbOrder.id,
            },
          }).catch(() => {});
        }
      }
    } catch (dbErr) {
      console.warn('Prisma webhook update fallback:', dbErr);
    }

    // 2. Sync local store
    const order = store.getOrderById(orderId);
    if (order) {
      order.mpPaymentId = mpPaymentId;
      order.paymentStatus = paymentStatus as any;

      if (status === 'approved') {
        store.addNotification({
          userId: order.clientId,
          title: 'Pagamento Mercado Pago Aprovado (Sandbox)',
          message: `O pagamento simulado do seu pedido #${order.orderNumber} foi confirmado com sucesso.`,
          type: 'ORDER_STATUS',
          orderId: order.id,
        });
      }
    }

    return NextResponse.json({ success: true, status: 'processed', paymentStatus });
  } catch {
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
