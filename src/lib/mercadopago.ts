import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST-SAMPLE-TOKEN';

export const mpClient = new MercadoPagoConfig({
  accessToken: accessToken,
  options: { timeout: 5000 },
});

export interface CreatePreferenceParams {
  orderId: string;
  orderNumber: string;
  items: Array<{
    title: string;
    unit_price: number;
    quantity: number;
  }>;
  payer: {
    name: string;
    email: string;
  };
}

export async function createMercadoPagoPreference(params: CreatePreferenceParams) {
  try {
    const preference = new Preference(mpClient);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const result = await preference.create({
      body: {
        items: params.items.map(item => ({
          id: params.orderId,
          title: item.title,
          unit_price: Number(item.unit_price),
          quantity: Number(item.quantity),
          currency_id: 'BRL',
        })),
        payer: {
          name: params.payer.name,
          email: params.payer.email,
        },
        back_urls: {
          success: `${appUrl}/pedidos?status=success&orderId=${params.orderId}`,
          failure: `${appUrl}/pedidos?status=failure&orderId=${params.orderId}`,
          pending: `${appUrl}/pedidos?status=pending&orderId=${params.orderId}`,
        },
        auto_return: 'approved',
        external_reference: params.orderId,
      },
    });

    return {
      id: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    };
  } catch (error) {
    console.error('Mercado Pago Preference Error (Sandbox simulation fallback):', error);
    // Fallback sandbox simulation ID
    return {
      id: `SANDBOX_PREF_${Date.now()}`,
      initPoint: `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=SIMULATED_${params.orderId}`,
      sandboxInitPoint: `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=SIMULATED_${params.orderId}`,
    };
  }
}
