import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleUpdate(request, params.id);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleUpdate(request, params.id);
}

async function handleUpdate(request: Request, id: string) {
  try {
    const body = await request.json();

    try {
      const updatedDb = await prisma.product.update({
        where: { id },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.description && { description: body.description }),
          ...(body.category && { category: body.category }),
          ...(body.unit && { unit: body.unit }),
          ...(body.price !== undefined && { price: Number(body.price) }),
          ...(body.stock !== undefined && { stock: Number(body.stock) }),
          ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
          ...(body.isOrganic !== undefined && { isOrganic: Boolean(body.isOrganic) }),
          ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        },
        include: { vendor: { select: { businessName: true } } },
      });

      store.updateProduct(id, body);

      return NextResponse.json({
        ...updatedDb,
        vendorName: updatedDb.vendor?.businessName,
      });
    } catch (dbErr) {
      console.warn('Prisma update product fallback to store:', dbErr);
    }

    const updated = store.updateProduct(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar produto.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    try {
      await prisma.product.update({
        where: { id: params.id },
        data: { isActive: false },
      });
    } catch (dbErr) {
      console.warn('Prisma delete product fallback to store:', dbErr);
    }

    const success = store.deleteProduct(params.id);
    if (!success) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao remover produto.' }, { status: 500 });
  }
}
