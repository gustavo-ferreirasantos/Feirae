import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId');
  const includeInactive = searchParams.get('includeInactive') === 'true' || searchParams.get('all') === 'true';

  try {
    const whereClause: any = {};
    if (!includeInactive) {
      whereClause.active = true;
    }

    if (vendorId && vendorId !== 'ALL') {
      const vendor = await prisma.vendor.findFirst({
        where: { OR: [{ id: vendorId }, { slug: vendorId }, { userId: vendorId }] },
        select: { id: true }
      });
      const resolvedVendorId = vendor ? vendor.id : vendorId;
      whereClause.OR = [
        { vendorId: resolvedVendorId },
        { vendorId: null },
      ];
    }

    const dbCoupons = await prisma.coupon.findMany({
      where: whereClause,
      include: {
        vendor: { select: { id: true, businessName: true } },
      },
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
    const formattedCode = (body.code || '').trim().toUpperCase();

    if (!formattedCode) {
      return NextResponse.json({ error: 'O código do cupom é obrigatório.' }, { status: 400 });
    }

    if (formattedCode.length < 3) {
      return NextResponse.json({ error: 'O código do cupom deve ter pelo menos 3 caracteres.' }, { status: 400 });
    }

    // Check code uniqueness
    const existing = await prisma.coupon.findUnique({
      where: { code: formattedCode },
    });
    if (existing) {
      return NextResponse.json({ error: 'Já existe um cupom cadastrado com este código.' }, { status: 409 });
    }

    // Discount value validation
    if (body.discountValue === undefined || body.discountValue === null || body.discountValue === '') {
      return NextResponse.json({ error: 'O valor do desconto é obrigatório.' }, { status: 400 });
    }
    const discountValue = Number(body.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'O valor do desconto deve ser um número maior que zero.' }, { status: 400 });
    }

    const discountType = body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json({ error: 'O desconto percentual não pode ser superior a 100%.' }, { status: 400 });
    }

    // Minimum order value validation
    const minOrderValue = Number(body.minOrderValue || 0);
    if (isNaN(minOrderValue) || minOrderValue < 0) {
      return NextResponse.json({ error: 'O valor mínimo do pedido não pode ser negativo.' }, { status: 400 });
    }

    // Max uses validation
    let maxUses: number | null = null;
    if (body.maxUses !== undefined && body.maxUses !== null && body.maxUses !== '') {
      maxUses = Number(body.maxUses);
      if (isNaN(maxUses) || maxUses <= 0 || !Number.isInteger(maxUses)) {
        return NextResponse.json({ error: 'O limite máximo de utilizações deve ser um número inteiro maior que zero.' }, { status: 400 });
      }
    }

    // Expiration date validation
    let expiresAt: Date | null = null;
    if (body.expiresAt) {
      expiresAt = new Date(body.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        return NextResponse.json({ error: 'Data de expiração inválida.' }, { status: 400 });
      }
      // Allow slight clock tolerance
      if (expiresAt.getTime() < Date.now() - 60000) {
        return NextResponse.json({ error: 'A data de expiração não pode estar no passado.' }, { status: 400 });
      }
    }

    // Resolve vendor if specified
    let resolvedVendorId: string | null = null;
    if (body.vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { OR: [{ id: body.vendorId }, { slug: body.vendorId }, { userId: body.vendorId }] },
        select: { id: true }
      });
      if (vendor) {
        resolvedVendorId = vendor.id;
      }
    }

    const created = await prisma.coupon.create({
      data: {
        code: formattedCode,
        discountType,
        discountValue,
        minOrderValue,
        maxUses,
        expiresAt,
        vendorId: resolvedVendorId,
        active: body.active !== undefined ? Boolean(body.active) : true,
      },
      include: {
        vendor: { select: { id: true, businessName: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating coupon in DB:', error);
    return NextResponse.json({ error: 'Erro ao criar cupom no banco de dados.' }, { status: 500 });
  }
}
