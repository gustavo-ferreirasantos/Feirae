import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get('includeAll') === 'true';

  try {
    const dbVendors = await prisma.vendor.findMany({
      where: includeAll ? {} : { active: true },
      include: {
        user: {
          select: { name: true, email: true, phone: true },
        },
        _count: {
          select: { products: true, orders: true, reviews: true },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { featuredOrder: 'asc' },
        { rating: 'desc' },
      ],
    });

    return NextResponse.json(dbVendors);
  } catch (err: any) {
    console.error('Prisma get vendors error:', err);
    return NextResponse.json({ error: 'Erro ao buscar feirantes do banco de dados.' }, { status: 500 });
  }
}
