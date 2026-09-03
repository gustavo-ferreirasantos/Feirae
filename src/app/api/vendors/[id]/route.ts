import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dbVendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
      },
      include: {
        products: { where: { isActive: true } },
        pickupWindows: { where: { active: true } },
        reviews: { orderBy: { createdAt: 'desc' } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (dbVendor) {
      return NextResponse.json({
        vendor: dbVendor,
        products: dbVendor.products,
        pickupWindows: dbVendor.pickupWindows,
        reviews: dbVendor.reviews,
      });
    }
  } catch (err) {
    console.warn('Prisma get vendor by id fallback:', err);
  }

  const vendor = store.getVendorById(params.id);
  if (!vendor) {
    return NextResponse.json({ error: 'Feirante não encontrado.' }, { status: 404 });
  }
  const products = store.getProducts(vendor.id);
  const pickupWindows = store.getPickupWindows(vendor.id);
  const reviews = store.getReviews(vendor.id);

  return NextResponse.json({
    vendor,
    products,
    pickupWindows,
    reviews,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    try {
      const dbUpdated = await prisma.vendor.update({
        where: { id: params.id },
        data: {
          ...(body.active !== undefined && { active: body.active }),
          ...(body.isSubscriber !== undefined && { isSubscriber: body.isSubscriber }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.fairLocation !== undefined && { fairLocation: body.fairLocation }),
          ...(body.boothNumber !== undefined && { boothNumber: body.boothNumber }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.businessName !== undefined && { businessName: body.businessName }),
          ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
          ...(body.avatar !== undefined && { avatar: body.avatar }),
        },
      });

      store.updateVendor(params.id, body);
      return NextResponse.json(dbUpdated);
    } catch (dbErr) {
      console.warn('Prisma update vendor fallback:', dbErr);
    }

    const updatedVendor = store.updateVendor(params.id, body);
    if (!updatedVendor) {
      return NextResponse.json({ error: 'Feirante não encontrado para atualização.' }, { status: 404 });
    }
    return NextResponse.json(updatedVendor);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar dados da barraca.' }, { status: 500 });
  }
}
