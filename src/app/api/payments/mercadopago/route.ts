import { NextResponse } from 'next/server';
import { createMercadoPagoPreference } from '@/lib/mercadopago';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const preference = await createMercadoPagoPreference(body);
    return NextResponse.json(preference);
  } catch (error) {
    console.error('Mercado Pago API error:', error);
    return NextResponse.json({ error: 'Erro ao gerar preferência Mercado Pago' }, { status: 500 });
  }
}
