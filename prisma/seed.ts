import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();
const DEMO_PASSWORD_HASH = hashPassword('senha123');

async function main() {
  console.log('🌱 Iniciando Seed estruturado e completo no banco de dados Feirae...');

  // 0. Limpar tabelas existentes em ordem de integridade referencial
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.pickupWindow.deleteMany();
  await prisma.vendorFairLocation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.fairLocation.deleteMany();
  await prisma.user.deleteMany();

  // 1. Criar Feiras Livres e Locais de Atendimento
  console.log('🏛️ Criando feiras livres e praças de atendimento...');
  const fair1 = await prisma.fairLocation.create({
    data: {
      id: 'fair-1',
      name: 'Feira Livre da Praça da Matriz',
      slug: 'praca-da-matriz',
      address: 'Praça da Matriz, Centro Histórico',
      city: 'Petrolina - PE',
      schedule: '06:00 às 13:00',
      operatingDays: 'Sábado',
      imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80',
      active: true,
    },
  });

  const fair2 = await prisma.fairLocation.create({
    data: {
      id: 'fair-2',
      name: 'Feira Noturna do Bairro Novo',
      slug: 'bairro-novo',
      address: 'Av. das Nações, 450 - Bairro Novo',
      city: 'Petrolina - PE',
      schedule: '17:00 às 22:00',
      operatingDays: 'Quarta-feira',
      imageUrl: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80',
      active: true,
    },
  });

  const fair3 = await prisma.fairLocation.create({
    data: {
      id: 'fair-3',
      name: 'Feira Agroecológica do Parque',
      slug: 'parque-ecologico',
      address: 'Parque Ecológico Municipal, Entrada Sul',
      city: 'Petrolina - PE',
      schedule: '07:00 às 12:00',
      operatingDays: 'Domingo',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
      active: true,
    },
  });

  // 2. Criar Usuários
  console.log('👤 Criando usuários...');
  const maria = await prisma.user.create({
    data: {
      id: 'user-client-1',
      name: 'Maria Oliveira',
      email: 'maria.oliveira@email.com',
      phone: '(87) 99801-8279',
      whatsappPhone: '(87) 99801-8279',
      role: 'CLIENT',
      passwordHash: DEMO_PASSWORD_HASH,
    },
  });

  const zeUser = await prisma.user.create({
    data: {
      id: 'user-vendor-1',
      name: 'José Pereira (Zé dos Orgânicos)',
      email: 'ze.organicos@feirae.com',
      phone: '(87) 99801-8279',
      whatsappPhone: '(87) 99801-8279',
      role: 'VENDOR',
      passwordHash: DEMO_PASSWORD_HASH,
    },
  });

  const neusaUser = await prisma.user.create({
    data: {
      id: 'user-vendor-2',
      name: 'Dona Neusa (Doces da Vovó)',
      email: 'neusa.doces@feirae.com',
      phone: '(87) 99801-8279',
      whatsappPhone: '(87) 99801-8279',
      role: 'VENDOR',
      passwordHash: DEMO_PASSWORD_HASH,
    },
  });

  const antonioUser = await prisma.user.create({
    data: {
      id: 'user-vendor-3',
      name: 'Antônio Queijeiro (Serra da Canastra)',
      email: 'antonio.queijos@feirae.com',
      phone: '(87) 99801-8279',
      whatsappPhone: '(87) 99801-8279',
      role: 'VENDOR',
      passwordHash: DEMO_PASSWORD_HASH,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      id: 'user-admin-1',
      name: 'Administração Feira Livre Central',
      email: 'admin@feirae.com',
      phone: '(87) 99801-8279',
      whatsappPhone: '(87) 99801-8279',
      role: 'ADMIN',
      passwordHash: DEMO_PASSWORD_HASH,
    },
  });

  // 3. Criar Feirantes/Vendedores
  console.log('🏪 Criando feirantes e barracas...');
  const vendorZe = await prisma.vendor.create({
    data: {
      id: 'vendor-1',
      userId: zeUser.id,
      businessName: 'Horta & Pomar do Zé',
      slug: 'horta-pomar-do-ze',
      description: 'Legumes, verduras e frutas 100% orgânicas colhidas na madrugada do dia da feira. Cultivo sustentável e sem agrotóxicos há mais de 15 anos.',
      category: 'Hortifrúti',
      fairLocation: 'Feira Livre da Praça da Matriz - Barraca 14',
      boothNumber: 'B-14',
      whatsappPhone: '87998018279',
      coverImage: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80',
      avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
      rating: 4.9,
      ratingCount: 38,
      plan: 'PRO',
      maxProducts: 9999,
      isSubscriber: true,
      commissionRate: 0,
      isFeatured: true,
      featuredUntil: new Date(Date.now() + 86400000 * 7),
      featuredOrder: 1,
      isCertifiedOrganic: true,
      certStatus: 'APPROVED',
      certRegistrationNumber: 'MAPA-ORG-2024-8841',
      certIssuingBody: 'Ecocert Brasil Certificações',
      active: true,
    },
  });

  const vendorNeusa = await prisma.vendor.create({
    data: {
      id: 'vendor-2',
      userId: neusaUser.id,
      businessName: 'Delícias & Doces da Neusa',
      slug: 'delicias-doces-da-neusa',
      description: 'Compotas caseiras, geleias de frutas da época, pães artesanais de fermentação natural e bolos quentinhos feitos com receitas de família.',
      category: 'Doces & Panificação',
      fairLocation: 'Feira Livre da Praça da Matriz - Barraca 08',
      boothNumber: 'B-08',
      whatsappPhone: '87998018279',
      coverImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
      avatar: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=200&q=80',
      rating: 4.8,
      ratingCount: 29,
      plan: 'FREE',
      maxProducts: 5,
      isSubscriber: false,
      commissionRate: 0.05,
      active: true,
    },
  });

  const vendorAntonio = await prisma.vendor.create({
    data: {
      id: 'vendor-3',
      userId: antonioUser.id,
      businessName: 'Queijaria Artesanal da Serra',
      slug: 'queijaria-artesanal-da-serra',
      description: 'Queijos meia cura, curados, frescais, manteiga de garrafa e doces de leite artesanais trazidos diretamente de pequenos produtores de Minas.',
      category: 'Queijos & Laticínios',
      fairLocation: 'Feira Livre da Praça da Matriz - Barraca 22',
      boothNumber: 'B-22',
      whatsappPhone: '87998018279',
      coverImage: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=1200&q=80',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      rating: 5.0,
      ratingCount: 45,
      plan: 'PRO',
      maxProducts: 9999,
      isSubscriber: true,
      commissionRate: 0,
      isFeatured: true,
      featuredUntil: new Date(Date.now() + 86400000 * 7),
      featuredOrder: 2,
      isCertifiedOrganic: false,
      certStatus: 'PENDING',
      certRegistrationNumber: 'SISORG-MG-55219',
      certIssuingBody: 'Rede de Agroecologia Ecovida',
      active: true,
    },
  });

  // 4. Vincular Feirantes a Feiras (VendorFairLocation)
  console.log('📍 Vinculando feirantes aos pontos de feira...');
  await prisma.vendorFairLocation.createMany({
    data: [
      { id: 'vf-1-1', vendorId: vendorZe.id, fairLocationId: fair1.id, boothNumber: 'B-14', assignedDays: 'Sábado' },
      { id: 'vf-1-3', vendorId: vendorZe.id, fairLocationId: fair3.id, boothNumber: 'A-02', assignedDays: 'Domingo' },
      { id: 'vf-2-1', vendorId: vendorNeusa.id, fairLocationId: fair1.id, boothNumber: 'B-08', assignedDays: 'Sábado' },
      { id: 'vf-3-1', vendorId: vendorAntonio.id, fairLocationId: fair1.id, boothNumber: 'B-22', assignedDays: 'Sábado' },
      { id: 'vf-3-2', vendorId: vendorAntonio.id, fairLocationId: fair2.id, boothNumber: 'N-15', assignedDays: 'Quarta-feira' },
    ],
  });

  // 5. Janelas de Retirada (Pickup Windows)
  console.log('⏰ Criando janelas de atendimento/retirada...');
  const pwZeSabado = await prisma.pickupWindow.create({
    data: {
      id: 'win-1',
      vendorId: vendorZe.id,
      fairLocationId: fair1.id,
      dayOfWeek: 'Sábado',
      startTime: '07:30',
      endTime: '10:00',
      location: 'Barraca 14 - Praça da Matriz',
      maxOrders: 30,
      active: true,
    },
  });

  await prisma.pickupWindow.create({
    data: {
      id: 'win-2',
      vendorId: vendorZe.id,
      fairLocationId: fair1.id,
      dayOfWeek: 'Sábado',
      startTime: '10:00',
      endTime: '12:30',
      location: 'Barraca 14 - Praça da Matriz',
      maxOrders: 30,
      active: true,
    },
  });

  const pwNeusaSabado = await prisma.pickupWindow.create({
    data: {
      id: 'win-3',
      vendorId: vendorNeusa.id,
      fairLocationId: fair1.id,
      dayOfWeek: 'Sábado',
      startTime: '08:00',
      endTime: '11:00',
      location: 'Barraca 08 - Praça da Matriz',
      maxOrders: 25,
      active: true,
    },
  });

  const pwAntonioSabado = await prisma.pickupWindow.create({
    data: {
      id: 'win-4',
      vendorId: vendorAntonio.id,
      fairLocationId: fair1.id,
      dayOfWeek: 'Sábado',
      startTime: '08:00',
      endTime: '12:00',
      location: 'Barraca 22 - Praça da Matriz',
      maxOrders: 20,
      active: true,
    },
  });

  // 6. Produtos
  console.log('🍎 Cadastrando produtos...');
  const prodAlface = await prisma.product.create({
    data: {
      id: 'prod-1',
      vendorId: vendorZe.id,
      name: 'Alface Crespa Orgânica (Maço)',
      description: 'Alface crespa fresca, colhida no dia, crocante e sem agrotóxicos.',
      category: 'Hortaliças',
      unit: 'maço',
      price: 4.50,
      stock: 25,
      imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=600&q=80',
      isOrganic: true,
      isWeighable: false,
      isActive: true,
    },
  });

  const prodTomate = await prisma.product.create({
    data: {
      id: 'prod-2',
      vendorId: vendorZe.id,
      name: 'Tomate Italiano Orgânico',
      description: 'Tomates maduros selecionados, ideais para molhos ou saladas frescas.',
      category: 'Legumes',
      unit: 'kg',
      price: 8.90,
      stock: 18,
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      isOrganic: true,
      isWeighable: true,
      isActive: true,
    },
  });

  const prodCenoura = await prisma.product.create({
    data: {
      id: 'prod-3',
      vendorId: vendorZe.id,
      name: 'Cenoura Orgânica Fresca',
      description: 'Cenouras crocantes com rama, ricas em sabor e nutrientes.',
      category: 'Legumes',
      unit: 'kg',
      price: 6.50,
      stock: 30,
      imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80',
      isOrganic: true,
      isWeighable: true,
      isActive: true,
    },
  });

  const prodPao = await prisma.product.create({
    data: {
      id: 'prod-4',
      vendorId: vendorNeusa.id,
      name: 'Pão Rústico de Fermentação Natural',
      description: 'Pão de casca crocante e miolo macio aerado, fermentação lenta de 24 horas.',
      category: 'Panificação',
      unit: 'unid',
      price: 18.00,
      stock: 10,
      imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=80',
      isOrganic: false,
      isWeighable: false,
      isActive: true,
    },
  });

  const prodQueijo = await prisma.product.create({
    data: {
      id: 'prod-6',
      vendorId: vendorAntonio.id,
      name: 'Queijo Meia Cura Canastra (Peça Aferida)',
      description: 'Autêntico queijo artesanal da Serra da Canastra, maturação de 21 dias. Preço por kg aferido na balança.',
      category: 'Queijos',
      unit: 'kg',
      price: 30.00,
      stock: 14,
      imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80',
      isOrganic: false,
      isWeighable: true,
      isActive: true,
    },
  });

  // 7. Cupons de Desconto
  console.log('🎟️ Criando cupons de desconto...');
  await prisma.coupon.createMany({
    data: [
      {
        id: 'coup-1',
        code: 'FEIRA10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 20.00,
        maxUses: 100,
        usedCount: 14,
        active: true,
      },
      {
        id: 'coup-2',
        code: 'ORGANICO5',
        discountType: 'FIXED',
        discountValue: 5.00,
        minOrderValue: 25.00,
        vendorId: vendorZe.id,
        maxUses: 50,
        usedCount: 8,
        active: true,
      },
    ],
  });

  // 8. Pedidos de Demonstração com Itens (Iniciando em NOVOS PEDIDOS no Kanban)
  console.log('📦 Criando pedidos de demonstração...');
  const order1 = await prisma.order.create({
    data: {
      id: 'order-1',
      orderNumber: 'PED-2026-8491',
      clientId: maria.id,
      clientName: maria.name,
      clientEmail: maria.email,
      clientPhone: maria.phone || '(87) 99801-8279',
      vendorId: vendorZe.id,
      pickupWindowId: pwZeSabado.id,
      pickupDate: 'Próximo Sábado (07:30 às 10:00)',
      pickupLocation: 'Barraca 14 - Praça da Matriz',
      totalAmount: 22.40,
      status: 'NOVO',
      paymentMethod: 'MERCADO_PAGO_PIX',
      paymentStatus: 'SIMULADO_APROVADO',
      notes: 'Por favor, embalar os tomates separadamente.',
      items: {
        create: [
          {
            id: 'item-1',
            productId: prodAlface.id,
            productName: prodAlface.name,
            productUnit: prodAlface.unit,
            unitPrice: prodAlface.price,
            quantity: 3,
            subtotal: 13.50,
          },
          {
            id: 'item-2',
            productId: prodTomate.id,
            productName: prodTomate.name,
            productUnit: prodTomate.unit,
            unitPrice: prodTomate.price,
            quantity: 1,
            measuredWeight: 1.00,
            subtotal: 8.90,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      id: 'order-2',
      orderNumber: 'PED-2026-9214',
      clientId: maria.id,
      clientName: maria.name,
      clientEmail: maria.email,
      clientPhone: maria.phone || '(87) 99801-8279',
      vendorId: vendorNeusa.id,
      pickupWindowId: pwNeusaSabado.id,
      pickupDate: 'Sábado Passado (08:00 às 11:00)',
      pickupLocation: 'Barraca 08 - Praça da Matriz',
      totalAmount: 36.00,
      status: 'RETIRADO',
      paymentMethod: 'RETIRADA',
      paymentStatus: 'PAGO_NA_RETIRADA',
      createdAt: new Date(Date.now() - 86400000 * 7),
      items: {
        create: [
          {
            id: 'item-3',
            productId: prodPao.id,
            productName: prodPao.name,
            productUnit: prodPao.unit,
            unitPrice: prodPao.price,
            quantity: 2,
            subtotal: 36.00,
          },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      id: 'order-3',
      orderNumber: 'PED-2026-3392',
      clientId: maria.id,
      clientName: maria.name,
      clientEmail: maria.email,
      clientPhone: maria.phone || '(87) 99801-8279',
      vendorId: vendorAntonio.id,
      pickupWindowId: pwAntonioSabado.id,
      pickupDate: 'Próximo Sábado (08:00 às 11:00)',
      pickupLocation: 'Barraca 22 - Praça da Matriz',
      totalAmount: 30.00,
      status: 'NOVO',
      paymentMethod: 'RETIRADA',
      paymentStatus: 'PAGO_NA_RETIRADA',
      notes: 'Separar uma peça de queijo bem curada.',
      items: {
        create: [
          {
            id: 'item-5',
            productId: prodQueijo.id,
            productName: prodQueijo.name,
            productUnit: prodQueijo.unit,
            unitPrice: prodQueijo.price,
            quantity: 1,
            measuredWeight: null,
            subtotal: 30.00,
          },
        ],
      },
    },
  });

  // 9. Avaliações (Reviews)
  console.log('⭐ Criando avaliações...');
  await prisma.review.create({
    data: {
      id: 'rev-1',
      orderId: order2.id,
      vendorId: vendorNeusa.id,
      clientId: maria.id,
      clientName: maria.name,
      rating: 5,
      comment: 'O pão de fermentação natural é maravilhoso, crocante por fora e super macio por dentro! Recomendo muito.',
    },
  });

  // 10. Notificações
  console.log('🔔 Criando notificações...');
  await prisma.notification.createMany({
    data: [
      {
        id: 'notif-1',
        userId: maria.id,
        title: 'Pedido Pronto para Retirada! 🎉',
        message: 'Seu pedido #PED-2026-8491 na Horta do Zé já está embalado e aguardando sua retirada na Barraca 14.',
        type: 'STATUS_PRONTO',
        orderId: order1.id,
        read: false,
      },
      {
        id: 'notif-2',
        userId: zeUser.id,
        title: 'Novo Pré-pedido Recebido!',
        message: 'Maria Oliveira fez o pedido #PED-2026-8491 no valor de R$ 22,40.',
        type: 'NEW_ORDER',
        orderId: order1.id,
        read: true,
      },
    ],
  });

  console.log('✅ Seed finalizado com sucesso com estrutura unificada e completa!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
