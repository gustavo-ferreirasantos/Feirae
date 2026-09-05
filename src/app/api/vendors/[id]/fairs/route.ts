import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dbVendorFairs = await prisma.vendorFairLocation.findMany({
      where: { vendorId: params.id, active: true },
      include: { fairLocation: true },
    });

    if (dbVendorFairs && dbVendorFairs.length > 0) {
      return NextResponse.json(dbVendorFairs);
    }
  } catch (err) {
    console.warn('Prisma get vendor fairs fallback:', err);
  }

  const vendorFairs = store.getVendorFairs(params.id);
  return NextResponse.json(vendorFairs);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { fairAssignments } = body; // Array of { fairLocationId, boothNumber, assignedDays }

    if (!Array.isArray(fairAssignments)) {
      return NextResponse.json(
        { error: 'fairAssignments deve ser uma lista.' },
        { status: 400 }
      );
    }

    try {
      // Prisma transaction
      await prisma.$transaction(async (tx) => {
        await tx.vendorFairLocation.deleteMany({
          where: { vendorId: params.id },
        });

        for (const fa of fairAssignments) {
          if (fa.fairLocationId) {
            await tx.vendorFairLocation.create({
              data: {
                vendorId: params.id,
                fairLocationId: fa.fairLocationId,
                boothNumber: fa.boothNumber || null,
                assignedDays: fa.assignedDays || null,
                active: true,
              },
            });
          }
        }
      });

      const updated = await prisma.vendorFairLocation.findMany({
        where: { vendorId: params.id, active: true },
        include: { fairLocation: true },
      });

      store.setVendorFairs(params.id, fairAssignments);
      return NextResponse.json(updated);
    } catch (dbErr) {
      console.warn('Prisma set vendor fairs fallback:', dbErr);
    }

    const updatedStore = store.setVendorFairs(params.id, fairAssignments);
    return NextResponse.json(updatedStore);
  } catch (err) {
    console.error('Error in POST /api/vendors/[id]/fairs:', err);
    return NextResponse.json({ error: 'Erro ao salvar feiras do feirante.' }, { status: 500 });
  }
}
