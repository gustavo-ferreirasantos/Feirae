import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, mpPaymentId, status } = body;

    const paymentStatus = status === 'approved' ? 'SIMULADO_APROVADO' : 'PENDENTE';

    const cleanId = String(orderId).trim();
    const withoutHash = cleanId.replace('#', '');

    const dbOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { id: withoutHash },
          { orderNumber: cleanId },
          { orderNumber: withoutHash },
        ],
      },
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
            title: 'Pagamento Aprovado',
            message: `O pagamento do seu pedido #${dbOrder.orderNumber} foi confirmado com sucesso.`,
            type: 'ORDER_STATUS',
            orderId: dbOrder.id,
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, status: 'processed', paymentStatus });
  } catch (err: any) {
    console.error('Error in webhook payment:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
