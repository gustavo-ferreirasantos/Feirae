import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    return NextResponse.json(dbCoupons);
  } catch (err: any) {
    console.error('Prisma get coupons error:', err);
    return NextResponse.json({ error: 'Erro ao buscar cupons do banco de dados.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const formattedCode = body.code?.trim().toUpperCase();

    if (!formattedCode || !body.discountValue) {
      return NextResponse.json({ error: 'Código e valor de desconto são obrigatórios.' }, { status: 400 });
    }

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
  } catch (error: any) {
    console.error('Error creating coupon in DB:', error);
    return NextResponse.json({ error: 'Erro ao criar cupom no banco de dados.' }, { status: 500 });
  }
}

