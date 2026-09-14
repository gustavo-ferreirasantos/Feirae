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

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }

    // Ownership check if vendorId is provided
    const requestedVendorId = body.vendorId || request.headers.get('x-vendor-id');
    if (requestedVendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          OR: [{ id: requestedVendorId }, { slug: requestedVendorId }, { userId: requestedVendorId }],
        },
      });

      if (!vendor || existing.vendorId !== vendor.id) {
        return NextResponse.json(
          { error: 'Acesso não autorizado. Você só pode editar produtos pertencentes à sua própria barraca.' },
          { status: 403 }
        );
      }
    }

    if (body.price !== undefined) {
      const priceNum = Number(body.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json(
          { error: 'Preço inválido: O preço deve ser um valor numérico maior que zero (R$ 0,01 ou superior).' },
          { status: 400 }
        );
      }
    }

    if (body.stock !== undefined) {
      const stockNum = Number(body.stock);
      if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
        return NextResponse.json(
          { error: 'Quantidade inválida: A quantidade em estoque deve ser um número inteiro maior ou igual a zero.' },
          { status: 400 }
        );
      }
    }

    const updatedDb = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
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
    const { searchParams } = new URL(request.url);
    let requestedVendorId = searchParams.get('vendorId') || request.headers.get('x-vendor-id');

    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }

    if (requestedVendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          OR: [{ id: requestedVendorId }, { slug: requestedVendorId }, { userId: requestedVendorId }],
        },
      });

      if (!vendor || existing.vendorId !== vendor.id) {
        return NextResponse.json(
          { error: 'Acesso não autorizado. Você só pode desativar produtos pertencentes à sua própria barraca.' },
          { status: 403 }
        );
      }
    }

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
