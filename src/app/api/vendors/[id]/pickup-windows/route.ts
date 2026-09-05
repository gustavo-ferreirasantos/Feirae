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
      include: {
        fairLocation: true,
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
    const { dayOfWeek, startTime, endTime, location, maxOrders, fairLocationId } = body;

    try {
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
    } catch (prismaErr) {
      console.warn('Prisma create pickup window fallback:', prismaErr);
      const createdMock = store.addPickupWindow({
        vendorId: params.id,
        dayOfWeek: dayOfWeek || 'Sábado',
        startTime: startTime || '08:00',
        endTime: endTime || '12:00',
        location: location || 'Praça da Feira Livre',
        maxOrders: Number(maxOrders) || 30,
        fairLocationId: fairLocationId || undefined,
        active: true,
      });
      return NextResponse.json(createdMock, { status: 201 });
    }
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

    try {
      await prisma.pickupWindow.update({
        where: { id: windowId },
        data: { active: false },
      });
    } catch (prismaErr) {
      console.warn('Prisma delete pickup window fallback:', prismaErr);
      store.deletePickupWindow(windowId);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao desativar janela de retirada.' }, { status: 500 });
  }
}
