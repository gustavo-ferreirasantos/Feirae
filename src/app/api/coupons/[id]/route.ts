import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const coupon = await prisma.coupon.findFirst({
      where: {
        OR: [
          { id: params.id },
          { code: params.id.trim().toUpperCase() },
        ],
      },
      include: {
        vendor: { select: { id: true, businessName: true } },
      },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Cupom não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(coupon);
  } catch (err: any) {
    console.error('Error fetching coupon by id:', err);
    return NextResponse.json({ error: 'Erro ao buscar dados do cupom.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const existing = await prisma.coupon.findFirst({
      where: {
        OR: [
          { id: params.id },
          { code: params.id.trim().toUpperCase() },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cupom não encontrado para atualização.' }, { status: 404 });
    }

    const updated = await prisma.coupon.update({
      where: { id: existing.id },
      data: {
        ...(body.active !== undefined && { active: Boolean(body.active) }),
        ...(body.maxUses !== undefined && { maxUses: body.maxUses ? Number(body.maxUses) : null }),
        ...(body.minOrderValue !== undefined && { minOrderValue: Number(body.minOrderValue) }),
        ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
      },
      include: {
        vendor: { select: { id: true, businessName: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Error updating coupon:', err);
    return NextResponse.json({ error: 'Erro ao atualizar cupom.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.coupon.findFirst({
      where: {
        OR: [
          { id: params.id },
          { code: params.id.trim().toUpperCase() },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cupom não encontrado para exclusão.' }, { status: 404 });
    }

    // Regra: Na exclusão, não remova um cupom que já esteja associado a pedidos para não comprometer o histórico. Nesse caso, desative o cupom.
    const associatedOrdersCount = await prisma.order.count({
      where: { couponCode: existing.code },
    });

    if (associatedOrdersCount > 0) {
      await prisma.coupon.update({
        where: { id: existing.id },
        data: { active: false },
      });

      return NextResponse.json({
        success: true,
        message: 'O cupom já possui histórico de pedidos associados e foi desativado em vez de excluído para preservar o histórico.',
        deactivated: true,
      });
    }

    // Se não houver pedidos associados, remove com segurança
    await prisma.coupon.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Cupom excluído com sucesso.',
      deleted: true,
    });
  } catch (err: any) {
    console.error('Error deleting coupon:', err);
    return NextResponse.json({ error: 'Erro ao excluir cupom.' }, { status: 500 });
  }
}
