import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      password, 
      role = 'CLIENT',
      businessName,
      category,
      fairLocation,
      boothNumber,
      description
    } = body;

    const cleanEmail = email?.trim().toLowerCase();

    if (!name || !cleanEmail || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);

    if (role === 'VENDOR') {
      if (!businessName || !category || !fairLocation) {
        return NextResponse.json({ 
          error: 'Para cadastrar feirante, informe o nome da barraca, categoria e localização na feira.' 
        }, { status: 400 });
      }

      const slugBase = businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const uniqueSlug = `${slugBase}-${Math.floor(100 + Math.random() * 900)}`;

      // Create User and Vendor in database
      const createdUser = await prisma.user.create({
        data: {
          name,
          email: cleanEmail,
          phone: phone || null,
          passwordHash: hashedPassword,
          role: Role.VENDOR,
          vendor: {
            create: {
              businessName,
              slug: uniqueSlug,
              description: description || `Produtos frescos selecionados de ${businessName}.`,
              category,
              fairLocation,
              boothNumber: boothNumber || null,
              rating: 5.0,
              ratingCount: 0,
              isSubscriber: true,
              active: false, // Requer aprovação do Administrador da feira
              pickupWindows: {
                create: [
                  {
                    dayOfWeek: 'Sábado',
                    startTime: '07:30',
                    endTime: '11:30',
                    location: fairLocation,
                    maxOrders: 30,
                    active: true,
                  },
                ],
              },
            },
          },
        },
        include: {
          vendor: true,
        },
      });

      return NextResponse.json({
        user: {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          phone: createdUser.phone || undefined,
          role: createdUser.role,
        },
        vendor: createdUser.vendor,
      }, { status: 201 });
    }

    // Standard Client Registration
    const createdClient = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        phone: phone || null,
        passwordHash: hashedPassword,
        role: Role.CLIENT,
      },
    });

    return NextResponse.json({
      user: {
        id: createdClient.id,
        name: createdClient.name,
        email: createdClient.email,
        phone: createdClient.phone || undefined,
        role: createdClient.role,
      },
      vendor: null,
    }, { status: 201 });

  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 });
  }
}
