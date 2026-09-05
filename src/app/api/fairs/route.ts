import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET() {
  try {
    const dbFairs = await prisma.fairLocation.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { vendors: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (dbFairs && dbFairs.length > 0) {
      const formatted = dbFairs.map(f => ({
        ...f,
        vendorCount: f._count?.vendors ?? 0,
      }));
      return NextResponse.json(formatted);
    }
  } catch (err) {
    console.warn('Prisma get fairs fallback:', err);
  }

  const fairs = store.getFairs();
  return NextResponse.json(fairs);
}
