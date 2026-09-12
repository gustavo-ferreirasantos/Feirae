import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json([]);
  }

  try {
    const dbNotifs = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const formatted = (dbNotifs || []).map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString ? n.createdAt.toISOString() : String(n.createdAt),
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('Prisma get notifs error:', err);
    return NextResponse.json({ error: 'Erro ao buscar notificações.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (userId) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating notifications in DB:', err);
    return NextResponse.json({ error: 'Erro ao marcar notificações.' }, { status: 500 });
  }
}
