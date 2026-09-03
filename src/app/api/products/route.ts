import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId') || undefined;
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const includeInactive = searchParams.get('includeInactive') === 'true';

  try {
    const whereClause: any = { 
      isActive: true,
      ...(!vendorId && !includeInactive && {
        vendor: { active: true },
      }),
    };

    if (vendorId) whereClause.vendorId = vendorId;
    if (category && category !== 'Todos') whereClause.category = { equals: category, mode: 'insensitive' };
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
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
  } catch (err) {
    console.warn('Prisma get products fallback to store:', err);
  }

  // Fallback to in-memory store
  const products = store.getProducts(vendorId, category, search);
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Try Prisma Neon
    try {
      const created = await prisma.product.create({
        data: {
          vendorId: body.vendorId,
          name: body.name,
          description: body.description,
          category: body.category,
          unit: body.unit || 'kg',
          price: Number(body.price),
          stock: Number(body.stock),
          imageUrl: body.imageUrl || null,
          isOrganic: Boolean(body.isOrganic),
          isActive: true,
        },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (dbErr) {
      console.warn('Prisma create product fallback:', dbErr);
    }

    const newProd = store.addProduct(body);
    return NextResponse.json(newProd, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar produto.' }, { status: 500 });
  }
}
