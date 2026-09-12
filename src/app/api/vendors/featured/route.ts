import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const dbFeatured = await prisma.vendor.findMany({
      where: {
        active: true,
        isFeatured: true,
        OR: [
          { featuredUntil: null },
          { featuredUntil: { gte: now } },
        ],
      },
      include: {
        products: {
          where: { isActive: true },
          take: 3,
          select: { id: true, name: true, price: true, unit: true, imageUrl: true },
        },
        user: {
          select: { name: true, phone: true },
        },
        _count: {
          select: { products: true, reviews: true },
        },
      },
      orderBy: [
        { featuredOrder: 'asc' },
        { rating: 'desc' },
      ],
    });

    return NextResponse.json(dbFeatured);
  } catch (err: any) {
    console.error('Error in /api/vendors/featured:', err);
    return NextResponse.json({ error: 'Erro ao buscar feirantes em destaque.' }, { status: 500 });
  }
}
