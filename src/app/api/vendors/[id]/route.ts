import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const vendorOrList = [
      { id: params.id },
      { slug: params.id },
      { userId: params.id },
    ];

    const dbVendor = await prisma.vendor.findFirst({
      where: {
        OR: vendorOrList,
      },
      include: {
        products: { where: { isActive: true } },
        pickupWindows: { where: { active: true } },
        reviews: { orderBy: { createdAt: 'desc' } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!dbVendor) {
      return NextResponse.json({ error: 'Feirante não encontrado no banco de dados.' }, { status: 404 });
    }

    return NextResponse.json({
      vendor: dbVendor,
      products: dbVendor.products,
      pickupWindows: dbVendor.pickupWindows,
      reviews: dbVendor.reviews,
    });
  } catch (err: any) {
    console.error('Prisma get vendor by id error:', err);
    return NextResponse.json({ error: 'Erro ao buscar dados da barraca no banco de dados.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const existingVendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }, { userId: params.id }],
      },
    });

    if (!existingVendor) {
      return NextResponse.json({ error: 'Feirante não encontrado para atualização.' }, { status: 404 });
    }

    const dbUpdated = await prisma.vendor.update({
      where: { id: existingVendor.id },
      data: {
        ...(body.active !== undefined && { active: body.active }),
        ...(body.isSubscriber !== undefined && { isSubscriber: body.isSubscriber }),
        ...(body.plan !== undefined && { plan: body.plan }),
        ...(body.maxProducts !== undefined && { maxProducts: body.maxProducts }),
        ...(body.commissionRate !== undefined && { commissionRate: body.commissionRate }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.fairLocation !== undefined && { fairLocation: body.fairLocation }),
        ...(body.boothNumber !== undefined && { boothNumber: body.boothNumber }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.businessName !== undefined && { businessName: body.businessName }),
        ...(body.whatsappPhone !== undefined && { whatsappPhone: body.whatsappPhone }),
        ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
        ...(body.avatar !== undefined && { avatar: body.avatar }),
        ...(body.isFeatured !== undefined && { isFeatured: Boolean(body.isFeatured) }),
        ...(body.featuredUntil !== undefined && { featuredUntil: body.featuredUntil ? new Date(body.featuredUntil) : null }),
        ...(body.featuredOrder !== undefined && { featuredOrder: Number(body.featuredOrder) }),
        ...(body.isCertifiedOrganic !== undefined && { isCertifiedOrganic: Boolean(body.isCertifiedOrganic) }),
        ...(body.certificationDocUrl !== undefined && { certificationDocUrl: body.certificationDocUrl }),
        ...(body.certStatus !== undefined && { certStatus: body.certStatus }),
        ...(body.certRegistrationNumber !== undefined && { certRegistrationNumber: body.certRegistrationNumber }),
        ...(body.certIssuingBody !== undefined && { certIssuingBody: body.certIssuingBody }),
        ...(body.certSubmittedAt !== undefined && { certSubmittedAt: body.certSubmittedAt ? new Date(body.certSubmittedAt) : null }),
        ...(body.certReviewedAt !== undefined && { certReviewedAt: body.certReviewedAt ? new Date(body.certReviewedAt) : null }),
        ...(body.certRejectionReason !== undefined && { certRejectionReason: body.certRejectionReason }),
      },
    });

    return NextResponse.json(dbUpdated);
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados da barraca no banco de dados.' }, { status: 500 });
  }
}

