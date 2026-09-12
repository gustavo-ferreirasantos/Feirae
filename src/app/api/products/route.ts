import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId') || undefined;
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const fairId = searchParams.get('fairId') || undefined;
  const includeInactive = searchParams.get('includeInactive') === 'true';

  try {
    const whereClause: any = { 
      isActive: true,
      ...(!vendorId && !includeInactive && {
        vendor: { active: true },
      }),
    };

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

    if (category && category !== 'Todos') {
      whereClause.category = { equals: category, mode: 'insensitive' };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { vendor: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (fairId && fairId !== 'ALL') {
      const fairVendors = await prisma.vendorFairLocation.findMany({
        where: {
          OR: [{ fairLocationId: fairId }, { fairLocation: { slug: fairId } }],
          active: true,
        },
        select: { vendorId: true },
      }).catch(() => []);

      const fairVendorIds = fairVendors.map(fv => fv.vendorId);
      if (whereClause.vendorId?.in) {
        whereClause.vendorId.in = whereClause.vendorId.in.filter((id: string) => fairVendorIds.includes(id));
      } else {
        whereClause.vendorId = { in: fairVendorIds };
      }
    }

    const dbProducts = await prisma.product.findMany({
      where: whereClause,
      include: { vendor: { select: { businessName: true, active: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      dbProducts.map(p => ({
        ...p,
        vendorName: p.vendor?.businessName,
      }))
    );
  } catch (err: any) {
    console.error('Prisma get products error:', err);
    return NextResponse.json({ error: 'Erro ao buscar produtos do banco de dados.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ id: body.vendorId }, { slug: body.vendorId }, { userId: body.vendorId }],
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Feirante não encontrado no banco de dados.' }, { status: 404 });
    }

    const activeCount = await prisma.product.count({
      where: { vendorId: vendor.id, isActive: true },
    });
    const isPro = vendor.plan === 'PRO' || vendor.isSubscriber;
    const maxLimit = vendor.maxProducts || 5;

    if (!isPro && activeCount >= maxLimit) {
      return NextResponse.json({
        error: `Limite de ${maxLimit} produtos do Plano Gratuito atingido. Faça upgrade para o Plano Feirante Pro para cadastrar produtos ilimitados e ter taxa 0%!`,
      }, { status: 403 });
    }

    const created = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: body.name,
        description: body.description,
        category: body.category,
        unit: body.unit || 'kg',
        price: Number(body.price),
        stock: Number(body.stock),
        imageUrl: body.imageUrl || null,
        isOrganic: Boolean(body.isOrganic),
        isWeighable: Boolean(body.isWeighable),
        isActive: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product in DB:', error);
    return NextResponse.json({ error: 'Erro ao criar produto no banco de dados.' }, { status: 500 });
  }
}

