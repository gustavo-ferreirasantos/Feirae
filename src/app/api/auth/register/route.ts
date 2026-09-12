import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { store } from '@/lib/store';
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

    // 1. Check if email already registered in store
    const existingInStore = store.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingInStore) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);
    const slugBase = (businessName || 'banca')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const uniqueSlug = `${slugBase}-${Math.floor(100 + Math.random() * 900)}`;

    // Try database creation
    try {
      // Check if email already registered in DB
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingUser) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 });
      }

      if (role === 'VENDOR') {
        if (!businessName || !category || !fairLocation) {
          return NextResponse.json({ 
            error: 'Para cadastrar feirante, informe o nome da barraca, categoria e localização na feira.' 
          }, { status: 400 });
        }

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

        // Sync local store
        const memoryUser = {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          phone: createdUser.phone || undefined,
          role: 'VENDOR' as const,
        };
        store.users.push(memoryUser);
        if (createdUser.vendor) {
          store.vendors.push({
            id: createdUser.vendor.id,
            userId: createdUser.vendor.userId,
            businessName: createdUser.vendor.businessName,
            slug: createdUser.vendor.slug,
            description: createdUser.vendor.description,
            category: createdUser.vendor.category,
            fairLocation: createdUser.vendor.fairLocation,
            boothNumber: createdUser.vendor.boothNumber || undefined,
            coverImage: createdUser.vendor.coverImage || undefined,
            avatar: createdUser.vendor.avatar || undefined,
            rating: createdUser.vendor.rating,
            ratingCount: createdUser.vendor.ratingCount,
            isSubscriber: createdUser.vendor.isSubscriber,
            commissionRate: createdUser.vendor.commissionRate,
            active: createdUser.vendor.active,
          });
        }

        return NextResponse.json({
          user: memoryUser,
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

      const memoryClient = {
        id: createdClient.id,
        name: createdClient.name,
        email: createdClient.email,
        phone: createdClient.phone || undefined,
        role: 'CLIENT' as const,
      };
      store.users.push(memoryClient);

      return NextResponse.json({
        user: memoryClient,
        vendor: null,
      }, { status: 201 });

    } catch (dbErr) {
      console.warn('Prisma registration fallback to local store:', dbErr);
    }

    // 2. In-Memory Store Fallback
    const fallbackUserId = `user-${Date.now()}`;

    if (role === 'VENDOR') {
      if (!businessName || !category || !fairLocation) {
        return NextResponse.json({ 
          error: 'Para cadastrar feirante, informe o nome da barraca, categoria e localização na feira.' 
        }, { status: 400 });
      }

      const fallbackVendorId = `vendor-${Date.now()}`;
      const newVendor = {
        id: fallbackVendorId,
        userId: fallbackUserId,
        businessName,
        slug: uniqueSlug,
        description: description || `Produtos frescos selecionados de ${businessName}.`,
        category,
        fairLocation,
        boothNumber: boothNumber || undefined,
        coverImage: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&auto=format&fit=crop&q=80',
        avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80',
        rating: 5.0,
        ratingCount: 0,
        isSubscriber: true,
        commissionRate: 0,
        active: false,
      };

      const newUser = {
        id: fallbackUserId,
        name,
        email: cleanEmail,
        phone: phone || undefined,
        role: 'VENDOR' as const,
      };

      store.users.push(newUser);
      store.vendors.push(newVendor);

      return NextResponse.json({
        user: newUser,
        vendor: newVendor,
      }, { status: 201 });
    }

    const newClient = {
      id: fallbackUserId,
      name,
      email: cleanEmail,
      phone: phone || undefined,
      role: 'CLIENT' as const,
    };

    store.users.push(newClient);

    return NextResponse.json({
      user: newClient,
      vendor: null,
    }, { status: 201 });

  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 });
  }
}
