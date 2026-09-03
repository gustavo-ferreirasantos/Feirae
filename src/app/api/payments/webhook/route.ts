import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, mpPaymentId, status } = body;

    const order = store.getOrderById(orderId);
    if (order) {
      order.mpPaymentId = mpPaymentId;
      order.paymentStatus = status === 'approved' ? 'SIMULADO_APROVADO' : 'PENDENTE';

      store.addNotification({
        userId: order.clientId,
        title: 'Pagamento Mercado Pago Aprovado (Sandbox)',
        message: `O pagamento simulado do seu pedido #${order.orderNumber} foi confirmado com sucesso.`,
        type: 'ORDER_STATUS',
        orderId: order.id,
      });
    }

    return NextResponse.json({ success: true, status: 'processed' });
  } catch {
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
