import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, cartTotal, vendorId } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ valid: false, error: 'Código de cupom não informado.' }, { status: 400 });
    }

    const numericCartTotal = Number(cartTotal) || 0;
    const formattedCode = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code: formattedCode },
      include: {
        vendor: { select: { id: true, businessName: true } },
      },
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Cupom não encontrado no sistema.' }, { status: 404 });
    }

    if (!coupon.active) {
      return NextResponse.json({ valid: false, error: 'Este cupom não está mais ativo.' }, { status: 400 });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ valid: false, error: 'Este cupom está expirado.' }, { status: 400 });
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: 'Este cupom já atingiu o limite máximo de utilizações.' }, { status: 400 });
    }

    if (numericCartTotal < coupon.minOrderValue) {
      return NextResponse.json({
        valid: false,
        error: `O valor mínimo para utilizar este cupom é de R$ ${coupon.minOrderValue.toFixed(2).replace('.', ',')}.`,
      }, { status: 400 });
    }

    if (coupon.vendorId) {
      if (!vendorId) {
        return NextResponse.json({
          valid: false,
          error: `Este cupom é exclusivo para a banca ${coupon.vendor?.businessName || 'específica'}.`,
        }, { status: 400 });
      }

      const vendor = await prisma.vendor.findFirst({
        where: { OR: [{ id: vendorId }, { slug: vendorId }, { userId: vendorId }] },
      });
      if (!vendor || coupon.vendorId !== vendor.id) {
        return NextResponse.json({
          valid: false,
          error: 'Este cupom é exclusivo para outra banca de feirante.',
        }, { status: 400 });
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((numericCartTotal * (coupon.discountValue / 100)) * 100) / 100;
    } else {
      discountAmount = Math.min(numericCartTotal, coupon.discountValue);
    }

    const finalTotal = Math.max(0, Math.round((numericCartTotal - discountAmount) * 100) / 100);

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
      },
      discountAmount,
      finalTotal,
    });
  } catch (error: any) {
    console.error('Error validating coupon in DB:', error);
    return NextResponse.json({ valid: false, error: 'Erro ao validar cupom no banco de dados.' }, { status: 500 });
  }
}
