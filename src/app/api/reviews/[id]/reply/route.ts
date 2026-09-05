import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const replyText = (body.reply || body.vendorReply || '').trim();

    if (!replyText) {
      return NextResponse.json(
        { error: 'O texto da resposta não pode ser vazio.' },
        { status: 400 }
      );
    }

    // 1. Try Prisma Database
    try {
      const review = await prisma.review.findUnique({
        where: { id: params.id },
        include: { vendor: true },
      });

      if (review) {
        const updatedReview = await prisma.review.update({
          where: { id: params.id },
          data: {
            vendorReply: replyText,
            vendorReplyAt: new Date(),
          },
        });

        // Create notification for client
        await prisma.notification.create({
          data: {
            userId: review.clientId,
            title: 'Sua avaliação foi respondida!',
            message: `${review.vendor.businessName} respondeu ao seu comentário: "${replyText.slice(0, 80)}${replyText.length > 80 ? '...' : ''}"`,
            type: 'REVIEW_REPLY',
            orderId: review.orderId,
          },
        }).catch(() => {});

        // Keep in-memory store in sync
        store.replyToReview(params.id, replyText);

        return NextResponse.json(updatedReview);
      }
    } catch (dbErr) {
      console.warn('Prisma reply review fallback:', dbErr);
    }

    // 2. Fallback to MemoryStore
    const result = store.replyToReview(params.id, replyText);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in PATCH /api/reviews/[id]/reply:', err);
    return NextResponse.json({ error: 'Erro ao enviar resposta à avaliação.' }, { status: 500 });
  }
}
