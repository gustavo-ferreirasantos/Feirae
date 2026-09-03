import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { INITIAL_USERS, INITIAL_VENDORS } from '@/lib/mock-data';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 });
    }

    // 1. Try finding in Prisma PostgreSQL Neon
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { vendor: true },
      });

      if (dbUser) {
        // If password was supplied, verify it
        if (password) {
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
            coverImage: dbUser.vendor.coverImage || undefined,
            avatar: dbUser.vendor.avatar || undefined,
            rating: dbUser.vendor.rating,
            ratingCount: dbUser.vendor.ratingCount,
            isSubscriber: dbUser.vendor.isSubscriber,
            commissionRate: dbUser.vendor.commissionRate,
            active: dbUser.vendor.active,
          } : null,
        });
      }
    } catch (dbErr) {
      console.warn('Prisma auth fallback to local users:', dbErr);
    }

    // 2. Fallback to in-memory users for demo test accounts
    const mockUser = INITIAL_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    if (mockUser) {
      const mockVendor = mockUser.role === 'VENDOR' 
        ? INITIAL_VENDORS.find(v => v.userId === mockUser.id) || INITIAL_VENDORS[0]
        : null;
      return NextResponse.json({
        user: mockUser,
        vendor: mockVendor,
      });
    }

    return NextResponse.json({ error: 'Nenhuma conta encontrada com este e-mail.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao autenticar.' }, { status: 500 });
  }
}
