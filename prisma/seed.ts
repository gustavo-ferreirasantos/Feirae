import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed no banco de dados FeiraLocal com IDs reais (CUID)...');

  // 0. Limpar tabelas existentes em ordem de integridade referencial
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.pickupWindow.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  // 1. Criar Usuários com IDs gerados automaticamente pelo Prisma (CUID)
  console.log('👤 Criando usuários...');
  const maria = await prisma.user.create({
    data: {
      name: 'Maria Oliveira',
      email: 'maria.oliveira@email.com',
      phone: '(11) 98765-4321',
      role: 'CLIENT',
    },
  });

  const zeUser = await prisma.user.create({
    data: {
      name: 'José Pereira (Zé dos Orgânicos)',
      email: 'ze.organicos@feiralocal.com',
      phone: '(11) 97654-3210',
      role: 'VENDOR',
    },
  });

  const neusaUser = await prisma.user.create({
    data: {
      name: 'Dona Neusa (Doces da Vovó)',
      email: 'neusa.doces@feiralocal.com',
      phone: '(11) 96543-2109',
      role: 'VENDOR',
    },
  });

  const antonioUser = await prisma.user.create({
    data: {
      name: 'Antônio Queijeiro (Serra da Canastra)',
      email: 'antonio.queijos@feiralocal.com',
      phone: '(11) 95432-1098',
      role: 'VENDOR',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Administração Feira Livre Central',
      email: 'admin@feiralocal.com',
      phone: '(11) 3333-4444',
      role: 'ADMIN',
    },
  });

  // 2. Criar Feirantes/Vendedores vinculados aos usuários
  console.log('🏪 Criando feirantes e barracas...');
  const vendorZe = await prisma.vendor.create({
    data: {
      userId: zeUser.id,
      businessName: 'Horta & Pomar do Zé',
      slug: 'horta-pomar-do-ze',
      description: 'Legumes, verduras e frutas 100% orgânicas colhidas na madrugada do dia da feira. Cultivo sustentável e sem agrotóxicos.',
      category: 'Hortifrúti',
      fairLocation: 'Feira Livre da Praça da Matriz - Barraca 14',
      boothNumber: 'B-14',
      coverImage: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80',
      avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
      rating: 4.9,
      ratingCount: 38,
      isSubscriber: true,
      commissionRate: 0,
      active: true,
    },
  });

  const vendorNeusa = await prisma.vendor.create({
    data: {
      userId: neusaUser.id,
      businessName: 'Delícias & Doces da Neusa',
      slug: 'delicias-doces-da-neusa',
      description: 'Compotas caseiras, geleias de frutas da época, pães artesanais de fermentação natural e bolos quentinhos.',
      category: 'Doces & Panificação',
      fairLocation: 'Feira Livre da Praça da Matriz - Barraca 08',
      boothNumber: 'B-08',
      coverImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
      avatar: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=200&q=80',
      rating: 4.8,
      ratingCount: 29,
      isSubscriber: false,
      commissionRate: 0.05,
      active: true,
    },
  });

  const vendorAntonio = await prisma.vendor.create({
    data: {
      userId: antonioUser.id,
      businessName: 'Queijaria Artesanal da Serra',
      slug: 'queijaria-artesanal-da-serra',
      description: 'Queijos meia cura, curados, frescais, manteiga de garrafa e doces de leite artesanais trazidos de pequenos produtores de Minas.',
      category: 'Queijos & Laticínios',
      fairLocation: 'Feira Livre da Praça da Matriz - Barraca 22',
      boothNumber: 'B-22',
      coverImage: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=1200&q=80',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      rating: 5.0,
      ratingCount: 45,
      isSubscriber: true,
      commissionRate: 0,
      active: true,
    },
  });

  // 3. Janelas de Retirada (Pickup Windows)
  console.log('⏰ Criando janelas de atendimento/retirada...');
  const pwZeSabado = await prisma.pickupWindow.create({
    data: {
      vendorId: vendorZe.id,
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
      vendorId: vendorZe.id,
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
      vendorId: vendorNeusa.id,
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
      vendorId: vendorAntonio.id,
      dayOfWeek: 'Sábado',
      startTime: '08:00',
      endTime: '12:00',
      location: 'Barraca 22 - Praça da Matriz',
      maxOrders: 20,
      active: true,
    },
  });

  // 4. Produtos
  console.log('🍎 Cadastrando produtos...');
  const prodAlface = await prisma.product.create({
    data: {
      vendorId: vendorZe.id,
      name: 'Alface Crespa Orgânica (Maço)',
      description: 'Alface crespa fresca, colhida no dia, crocante e sem agrotóxicos.',
      category: 'Hortaliças',
      unit: 'maço',
      price: 4.50,
      stock: 25,
      imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=600&q=80',
      isOrganic: true,
      isActive: true,
    },
  });

  const prodTomate = await prisma.product.create({
    data: {
      vendorId: vendorZe.id,
      name: 'Tomate Italiano Orgânico',
      description: 'Tomates maduros selecionados, ideais para molhos ou saladas frescas.',
      category: 'Legumes',
      unit: 'kg',
      price: 8.90,
      stock: 18,
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      isOrganic: true,
      isActive: true,
    },
  });

  const prodCenoura = await prisma.product.create({
    data: {
      vendorId: vendorZe.id,
      name: 'Cenoura Orgânica Fresca',
      description: 'Cenouras crocantes com rama, ricas em sabor e nutrientes.',
      category: 'Legumes',
      unit: 'kg',
      price: 6.50,
      stock: 30,
      imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80',
      isOrganic: true,
      isActive: true,
    },
  });

  const prodPao = await prisma.product.create({
    data: {
      vendorId: vendorNeusa.id,
      name: 'Pão Rústico de Fermentação Natural',
      description: 'Pão de casca crocante e miolo macio aerado, fermentação lenta de 24 horas.',
      category: 'Panificação',
      unit: 'unid',
      price: 18.00,
      stock: 10,
      imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=80',
      isOrganic: false,
      isActive: true,
    },
  });

  const prodGeleia = await prisma.product.create({
    data: {
      vendorId: vendorNeusa.id,
      name: 'Geleia Artesanal de Morango (240g)',
      description: 'Geleia caseira feita com pedaços de morangos frescos e açúcar demerara.',
      category: 'Doces & Compotas',
      unit: 'pote',
      price: 16.00,
      stock: 15,
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
      isOrganic: false,
      isActive: true,
    },
  });

  const prodQueijo = await prisma.product.create({
    data: {
      vendorId: vendorAntonio.id,
      name: 'Queijo Meia Cura Canastra (600g)',
      description: 'Autêntico queijo artesanal da Serra da Canastra, maturação de 21 dias.',
      category: 'Queijos',
      unit: 'peça',
      price: 38.00,
      stock: 14,
      imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80',
      isOrganic: false,
      isActive: true,
    },
  });

  // 5. Pedidos de Demonstração com Itens
  console.log('📦 Criando pedidos de demonstração...');
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-8491',
      clientId: maria.id,
      clientName: maria.name,
      clientEmail: maria.email,
      clientPhone: maria.phone || '(11) 98765-4321',
      vendorId: vendorZe.id,
      pickupWindowId: pwZeSabado.id,
      pickupDate: '2026-09-05',
      pickupLocation: 'Barraca 14 - Praça da Matriz',
      totalAmount: 22.30,
      status: 'PRONTO',
      paymentMethod: 'MERCADO_PAGO_PIX',
      paymentStatus: 'SIMULADO_APROVADO',
      notes: 'Por favor, embalar os tomates separadamente.',
      items: {
        create: [
          {
            productId: prodAlface.id,
            productName: prodAlface.name,
            productUnit: prodAlface.unit,
            unitPrice: prodAlface.price,
            quantity: 3,
            subtotal: 13.50,
          },
          {
            productId: prodTomate.id,
            productName: prodTomate.name,
            productUnit: prodTomate.unit,
            unitPrice: prodTomate.price,
            quantity: 1,
            subtotal: 8.90,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-9214',
      clientId: maria.id,
      clientName: maria.name,
      clientEmail: maria.email,
      clientPhone: maria.phone || '(11) 98765-4321',
      vendorId: vendorNeusa.id,
      pickupWindowId: pwNeusaSabado.id,
      pickupDate: '2026-09-05',
      pickupLocation: 'Barraca 08 - Praça da Matriz',
      totalAmount: 34.00,
      status: 'RETIRADO',
      paymentMethod: 'RETIRADA',
      paymentStatus: 'PAGO_NA_RETIRADA',
      items: {
        create: [
          {
            productId: prodPao.id,
            productName: prodPao.name,
            productUnit: prodPao.unit,
            unitPrice: prodPao.price,
            quantity: 1,
            subtotal: 18.00,
          },
          {
            productId: prodGeleia.id,
            productName: prodGeleia.name,
            productUnit: prodGeleia.unit,
            unitPrice: prodGeleia.price,
            quantity: 1,
            subtotal: 16.00,
          },
        ],
      },
    },
  });

  // 6. Avaliações (Reviews)
  console.log('⭐ Criando avaliações...');
  await prisma.review.create({
    data: {
      orderId: order2.id,
      vendorId: vendorNeusa.id,
      clientId: maria.id,
      clientName: maria.name,
      rating: 5,
      comment: 'O pão é maravilhoso e a geleia de morango tem pedaços de fruta de verdade! Recomendo muito.',
    },
  });

  // 7. Notificações
  console.log('🔔 Criando notificações...');
  await prisma.notification.create({
    data: {
      userId: maria.id,
      title: 'Pedido Pronto para Retirada! 🎉',
      message: 'Seu pedido #PED-2026-8491 na Horta do Zé já está embalado e aguardando sua retirada na Barraca 14.',
      type: 'STATUS_PRONTO',
      orderId: order1.id,
      read: false,
    },
  });

  console.log('✅ Seed finalizado com sucesso com todos os IDs reais gerados!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
