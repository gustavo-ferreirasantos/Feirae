import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

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
      orderBy: { createdAt: 'desc' },
    });

    if (dbVendors && dbVendors.length > 0) {
      return NextResponse.json(dbVendors);
    }
  } catch (err) {
    console.warn('Prisma get vendors fallback to store:', err);
  }

  const vendors = store.getVendors();
  return NextResponse.json(vendors);
}
