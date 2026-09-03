import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId') || undefined;

  try {
    const whereClause: any = {};
    if (vendorId) {
      whereClause.OR = [{ vendorId }, { vendor: { slug: vendorId } }];
    }

    const dbReviews = await prisma.review.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    if (dbReviews && dbReviews.length > 0) {
      return NextResponse.json(dbReviews);
    }
  } catch (err) {
    console.warn('Prisma get reviews fallback:', err);
  }

  const reviews = store.getReviews(vendorId);
  return NextResponse.json(reviews);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, rating, comment, clientId } = body;

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { client: true },
      });

      if (order) {
        const createdReview = await prisma.review.create({
          data: {
            orderId: order.id,
            vendorId: order.vendorId,
            clientId: clientId || order.clientId,
            clientName: order.clientName,
            rating: Number(rating),
            comment: comment || null,
          },
        });

        // Recalculate vendor rating
        const allVendorReviews = await prisma.review.findMany({
          where: { vendorId: order.vendorId },
        });
        const avg = allVendorReviews.reduce((sum, r) => sum + r.rating, 0) / allVendorReviews.length;
        await prisma.vendor.update({
          where: { id: order.vendorId },
          data: {
            rating: Math.round(avg * 10) / 10,
            ratingCount: allVendorReviews.length,
          },
        });

        store.addReview(body);
        return NextResponse.json(createdReview, { status: 201 });
      }
    } catch (dbErr) {
      console.warn('Prisma create review fallback:', dbErr);
    }

    const result = store.addReview(body);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao publicar avaliação.' }, { status: 500 });
  }
}
