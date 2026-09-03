import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const windows = await prisma.pickupWindow.findMany({
      where: {
        vendorId: params.id,
        active: true,
      },
    });
    if (windows && windows.length > 0) {
      return NextResponse.json(windows);
    }
  } catch (err) {
    console.warn('Prisma get pickup windows fallback:', err);
  }

  const mockWindows = store.getPickupWindows(params.id);
  return NextResponse.json(mockWindows);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { dayOfWeek, startTime, endTime, location, maxOrders } = body;

    const created = await prisma.pickupWindow.create({
      data: {
        vendorId: params.id,
        dayOfWeek: dayOfWeek || 'Sábado',
        startTime: startTime || '08:00',
        endTime: endTime || '12:00',
        location: location || 'Praça da Feira Livre',
        maxOrders: Number(maxOrders) || 30,
        active: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao cadastrar janela de retirada.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const windowId = searchParams.get('windowId');
    if (!windowId) {
      return NextResponse.json({ error: 'ID da janela obrigatório.' }, { status: 400 });
    }

    await prisma.pickupWindow.update({
      where: { id: windowId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao desativar janela de retirada.' }, { status: 500 });
  }
}
