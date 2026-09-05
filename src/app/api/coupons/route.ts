import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId') || undefined;

  try {
    const whereClause: any = { active: true };
    if (vendorId) {
      whereClause.OR = [
        { vendorId: vendorId },
        { vendorId: null },
      ];
    }

    const dbCoupons = await prisma.coupon.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    if (dbCoupons && dbCoupons.length > 0) {
      return NextResponse.json(dbCoupons);
    }
  } catch (err) {
    console.warn('Prisma get coupons fallback to store:', err);
  }

  const coupons = store.getCoupons(vendorId);
  return NextResponse.json(coupons);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const formattedCode = body.code?.trim().toUpperCase();

    if (!formattedCode || !body.discountValue) {
      return NextResponse.json({ error: 'Código e valor de desconto são obrigatórios.' }, { status: 400 });
    }

    // 1. Try Prisma DB
    try {
      const created = await prisma.coupon.create({
        data: {
          code: formattedCode,
          discountType: body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
          discountValue: Number(body.discountValue),
          minOrderValue: Number(body.minOrderValue || 0),
          maxUses: body.maxUses ? Number(body.maxUses) : null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          vendorId: body.vendorId || null,
          active: body.active !== undefined ? Boolean(body.active) : true,
        },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (dbErr) {
      console.warn('Prisma create coupon fallback to store:', dbErr);
    }

    // 2. Fallback to store
    const newCoupon = {
      id: `coup-${Date.now()}`,
      code: formattedCode,
      discountType: (body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE') as 'FIXED' | 'PERCENTAGE',
      discountValue: Number(body.discountValue),
      minOrderValue: Number(body.minOrderValue || 0),
      maxUses: body.maxUses ? Number(body.maxUses) : undefined,
      usedCount: 0,
      expiresAt: body.expiresAt ? new Date(body.expiresAt).toISOString() : undefined,
      vendorId: body.vendorId || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };
    store.coupons.unshift(newCoupon);
    return NextResponse.json(newCoupon, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar cupom.' }, { status: 500 });
  }
}
