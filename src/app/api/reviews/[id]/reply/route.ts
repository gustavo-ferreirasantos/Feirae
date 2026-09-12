import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    const review = await prisma.review.findUnique({
      where: { id: params.id },
      include: { vendor: true },
    });

    if (!review) {
      return NextResponse.json({ error: 'Avaliação não encontrada no banco de dados.' }, { status: 404 });
    }

    const updatedReview = await (prisma.review as any).update({
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

    return NextResponse.json({
      ...updatedReview,
      createdAt: updatedReview.createdAt.toISOString ? updatedReview.createdAt.toISOString() : String(updatedReview.createdAt),
      vendorReplyAt: updatedReview.vendorReplyAt?.toISOString ? updatedReview.vendorReplyAt.toISOString() : updatedReview.vendorReplyAt,
    });
  } catch (err: any) {
    console.error('Error in PATCH /api/reviews/[id]/reply:', err);
    return NextResponse.json({ error: 'Erro ao enviar resposta à avaliação no banco de dados.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.review.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Avaliação não encontrada no banco de dados.' }, { status: 404 });
    }

    const updated = await (prisma.review as any).update({
      where: { id: params.id },
      data: {
        vendorReply: null,
        vendorReplyAt: null,
      },
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString ? updated.createdAt.toISOString() : String(updated.createdAt),
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/reviews/[id]/reply:', err);
    return NextResponse.json({ error: 'Erro ao excluir resposta no banco de dados.' }, { status: 500 });
  }
}
