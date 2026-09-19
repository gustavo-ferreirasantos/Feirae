import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// A vendor acting on a coupon must own it; global coupons (vendorId null) are platform-only.
async function assertCouponScope(existing: { vendorId: string | null }, requestedVendorId?: string | null) {
  if (!requestedVendorId) return null; // admin / platform call
  const vendor = await prisma.vendor.findFirst({
    where: { OR: [{ id: requestedVendorId }, { slug: requestedVendorId }, { userId: requestedVendorId }] },
    select: { id: true },
  });
  if (!vendor || existing.vendorId !== vendor.id) {
    return NextResponse.json(
      { error: 'Acesso não autorizado. Você só pode alterar cupons da sua própria barraca.' },
      { status: 403 }
    );
  }
  return null;
}

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

    const denied = await assertCouponScope(existing, body.vendorId || request.headers.get('x-vendor-id'));
    if (denied) return denied;

    const data: Prisma.CouponUpdateInput = {};

    if (body.active !== undefined) data.active = Boolean(body.active);

    if (body.maxUses !== undefined) {
      if (body.maxUses === null || body.maxUses === '') {
        data.maxUses = null;
      } else {
        const maxUses = Number(body.maxUses);
        if (!Number.isInteger(maxUses) || maxUses <= 0) {
          return NextResponse.json({ error: 'O limite de utilizações deve ser um número inteiro maior que zero.' }, { status: 400 });
        }
        if (maxUses < existing.usedCount) {
          return NextResponse.json({ error: `O limite não pode ser menor que os ${existing.usedCount} usos já realizados.` }, { status: 400 });
        }
        data.maxUses = maxUses;
      }
    }

    if (body.minOrderValue !== undefined) {
      const minOrderValue = Number(body.minOrderValue);
      if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
        return NextResponse.json({ error: 'O valor mínimo do pedido não pode ser negativo.' }, { status: 400 });
      }
      data.minOrderValue = minOrderValue;
    }

    if (body.expiresAt !== undefined) {
      if (!body.expiresAt) {
        data.expiresAt = null;
      } else {
        const expiresAt = new Date(body.expiresAt);
        if (isNaN(expiresAt.getTime())) {
          return NextResponse.json({ error: 'Data de expiração inválida.' }, { status: 400 });
        }
        data.expiresAt = expiresAt;
      }
    }

    const updated = await prisma.coupon.update({
      where: { id: existing.id },
      data,
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

    const { searchParams } = new URL(request.url);
    const denied = await assertCouponScope(existing, searchParams.get('vendorId') || request.headers.get('x-vendor-id'));
    if (denied) return denied;

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
