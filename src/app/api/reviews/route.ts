import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId') || undefined;

  try {
    const whereClause: any = {};
    if (vendorId && vendorId !== 'ALL') {
      const matchingVendors = await prisma.vendor.findMany({
        where: {
          OR: [{ id: vendorId }, { slug: vendorId }, { userId: vendorId }],
        },
        select: { id: true },
      }).catch(() => []);
      const vIds = Array.from(new Set([vendorId, ...matchingVendors.map(v => v.id)]));
      whereClause.vendorId = { in: vIds };
    }

    const fetchedReviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        vendor: { select: { businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = fetchedReviews.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString ? r.createdAt.toISOString() : String(r.createdAt),
      vendorReplyAt: r.vendorReplyAt?.toISOString ? r.vendorReplyAt.toISOString() : r.vendorReplyAt,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('Prisma get reviews error:', err);
    return NextResponse.json({ error: 'Erro ao buscar avaliações do banco de dados.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, rating, comment, clientId, clientName } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Identificação do pedido é obrigatória.' }, { status: 400 });
    }

    const cleanOrderId = String(orderId).trim();
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: cleanOrderId },
          { orderNumber: cleanOrderId },
          { orderNumber: cleanOrderId.replace('#', '') },
        ],
      },
      include: { client: true, vendor: true, review: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado no banco de dados.' }, { status: 404 });
    }

    if (order.review) {
      return NextResponse.json({ error: 'Este pedido já foi avaliado.' }, { status: 400 });
    }

    const existingDbReview = await prisma.review.findFirst({
      where: { orderId: order.id },
    });
    if (existingDbReview) {
      return NextResponse.json({ error: 'Este pedido já foi avaliado.' }, { status: 400 });
    }

    const ratingNum = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    const finalClientName = clientName || order.clientName || order.client?.name || 'Cliente Consumidor';

    const createdReview = await prisma.review.create({
      data: {
        orderId: order.id,
        vendorId: order.vendorId,
        clientId: order.clientId,
        clientName: finalClientName,
        rating: ratingNum,
        comment: comment ? String(comment).trim() : null,
      },
    });

    // Recalculate vendor rating in DB
    const allVendorReviews = await prisma.review.findMany({
      where: { vendorId: order.vendorId },
    });
    const totalRatings = allVendorReviews.length;
    const avg = totalRatings > 0 
      ? allVendorReviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
      : ratingNum;

    await prisma.vendor.update({
      where: { id: order.vendorId },
      data: {
        rating: Math.round(avg * 10) / 10,
        ratingCount: totalRatings,
      },
    }).catch(() => {});

    return NextResponse.json({
      id: createdReview.id,
      orderId: createdReview.orderId,
      vendorId: createdReview.vendorId,
      clientId: createdReview.clientId,
      clientName: createdReview.clientName,
      rating: createdReview.rating,
      comment: createdReview.comment || undefined,
      createdAt: createdReview.createdAt.toISOString(),
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error in POST /api/reviews:', err);
    return NextResponse.json({ error: 'Erro ao publicar avaliação no banco de dados.' }, { status: 500 });
  }
}

