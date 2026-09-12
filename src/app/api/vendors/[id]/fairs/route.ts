import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dbVendorFairs = await prisma.vendorFairLocation.findMany({
      where: { vendorId: params.id, active: true },
      include: { fairLocation: true },
    });

    return NextResponse.json(dbVendorFairs);
  } catch (err: any) {
    console.error('Prisma get vendor fairs error:', err);
    return NextResponse.json({ error: 'Erro ao buscar feiras do feirante.' }, { status: 500 });
  }
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

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Error in POST /api/vendors/[id]/fairs:', err);
    return NextResponse.json({ error: 'Erro ao salvar feiras do feirante no banco de dados.' }, { status: 500 });
  }
}
