import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
      include: {
        fairLocation: true,
      },
    });

    return NextResponse.json(windows);
  } catch (err: any) {
    console.error('Prisma get pickup windows error:', err);
    return NextResponse.json({ error: 'Erro ao buscar janelas de retirada.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { dayOfWeek, startTime, endTime, location, maxOrders, fairLocationId } = body;

    const created = await prisma.pickupWindow.create({
      data: {
        vendorId: params.id,
        dayOfWeek: dayOfWeek || 'Sábado',
        startTime: startTime || '08:00',
        endTime: endTime || '12:00',
        location: location || 'Praça da Feira Livre',
        maxOrders: Number(maxOrders) || 30,
        fairLocationId: fairLocationId || null,
        active: true,
      },
      include: {
        fairLocation: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('Error creating pickup window in DB:', err);
    return NextResponse.json({ error: 'Erro ao cadastrar janela de retirada no banco de dados.' }, { status: 500 });
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
  } catch (err: any) {
    console.error('Error deleting pickup window in DB:', err);
    return NextResponse.json({ error: 'Erro ao desativar janela de retirada.' }, { status: 500 });
  }
}
