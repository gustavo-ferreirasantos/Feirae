import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET() {
  try {
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

      if (dbFeatured && dbFeatured.length > 0) {
        return NextResponse.json(dbFeatured);
      }
    } catch (err) {
      console.warn('Prisma get featured vendors fallback to store:', err);
    }

    const featured = typeof store.getFeaturedVendors === 'function'
      ? store.getFeaturedVendors()
      : (store.vendors || [])
          .filter(v => v.active && v.isFeatured && (!v.featuredUntil || new Date(v.featuredUntil).getTime() >= Date.now()))
          .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));

    return NextResponse.json(featured);
  } catch (outerErr: any) {
    console.error('Error in /api/vendors/featured:', outerErr);
    return NextResponse.json([], { status: 200 });
  }
}
