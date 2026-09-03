import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

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
    if (dbNotifs && dbNotifs.length > 0) {
      return NextResponse.json(dbNotifs);
    }
  } catch (err) {
    console.warn('Prisma get notifs fallback:', err);
  }

  const notifs = store.getNotifications(userId);
  return NextResponse.json(notifs);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (userId) {
      try {
        await prisma.notification.updateMany({
          where: { userId, read: false },
          data: { read: true },
        });
      } catch (err) {
        console.warn('Prisma mark notifs read fallback:', err);
      }

      store.getNotifications(userId).forEach(n => {
        n.read = true;
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao marcar notificações.' }, { status: 500 });
  }
}
