import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    const formatted = dbFairs.map(f => ({
      ...f,
      vendorCount: f._count?.vendors ?? 0,
    }));
    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('Prisma get fairs error:', err);
    return NextResponse.json({ error: 'Erro ao buscar feiras do banco de dados.' }, { status: 500 });
  }
}
