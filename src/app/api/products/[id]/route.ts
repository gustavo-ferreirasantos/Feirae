import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    const updatedDb = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category && { category: body.category }),
        ...(body.unit && { unit: body.unit }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.stock !== undefined && { stock: Number(body.stock) }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.isOrganic !== undefined && { isOrganic: Boolean(body.isOrganic) }),
        ...(body.isWeighable !== undefined && { isWeighable: Boolean(body.isWeighable) }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      },
      include: { vendor: { select: { businessName: true } } },
    });

    return NextResponse.json({
      ...updatedDb,
      vendorName: updatedDb.vendor?.businessName,
    });
  } catch (err: any) {
    console.error('Error updating product in DB:', err);
    return NextResponse.json({ error: 'Erro ao atualizar produto no banco de dados.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Produto desativado com sucesso.' });
  } catch (err: any) {
    console.error('Error deleting product in DB:', err);
    return NextResponse.json({ error: 'Erro ao remover produto no banco de dados.' }, { status: 500 });
  }
}
