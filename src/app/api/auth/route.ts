import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { vendor: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Nenhuma conta cadastrada encontrada com este e-mail.' }, { status: 404 });
    }

    // If password was supplied, verify it
    if (password && dbUser.passwordHash) {
      const isValid = verifyPassword(password, dbUser.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Senha incorreta. Verifique e tente novamente.' }, { status: 401 });
      }
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone || undefined,
        role: dbUser.role,
      },
      vendor: dbUser.vendor ? {
        id: dbUser.vendor.id,
        userId: dbUser.vendor.userId,
        businessName: dbUser.vendor.businessName,
        slug: dbUser.vendor.slug,
        description: dbUser.vendor.description,
        category: dbUser.vendor.category,
        fairLocation: dbUser.vendor.fairLocation,
        boothNumber: dbUser.vendor.boothNumber || undefined,
        whatsappPhone: dbUser.vendor.whatsappPhone || undefined,
        coverImage: dbUser.vendor.coverImage || undefined,
        avatar: dbUser.vendor.avatar || undefined,
        rating: dbUser.vendor.rating,
        ratingCount: dbUser.vendor.ratingCount,
        plan: dbUser.vendor.plan,
        maxProducts: dbUser.vendor.maxProducts,
        isSubscriber: dbUser.vendor.isSubscriber,
        commissionRate: dbUser.vendor.commissionRate,
        isFeatured: dbUser.vendor.isFeatured,
        featuredUntil: dbUser.vendor.featuredUntil?.toISOString ? dbUser.vendor.featuredUntil.toISOString() : dbUser.vendor.featuredUntil,
        isCertifiedOrganic: dbUser.vendor.isCertifiedOrganic,
        certStatus: dbUser.vendor.certStatus,
        active: dbUser.vendor.active,
      } : null,
    });
  } catch (error: any) {
    console.error('Error in POST /api/auth:', error);
    return NextResponse.json({ error: 'Erro ao autenticar com o banco de dados.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: { vendor: true },
      orderBy: { createdAt: 'asc' },
    });

    const formattedUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || undefined,
      role: u.role,
      vendor: u.vendor || null,
    }));

    const vendors = await prisma.vendor.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      users: formattedUsers,
      vendors,
    });
  } catch (err: any) {
    console.error('Error in GET /api/auth users:', err);
    return NextResponse.json({ users: [], vendors: [] }, { status: 500 });
  }
}

