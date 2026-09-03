import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET() {
  try {
    const [vendorsCount, orders, subscribersCount] = await Promise.all([
      prisma.vendor.count({ where: { active: true } }),
      prisma.order.findMany({ select: { status: true, totalAmount: true } }),
      prisma.vendor.count({ where: { isSubscriber: true, active: true } }),
    ]);

    if (vendorsCount > 0 || orders.length > 0) {
      const ordersByStatus = {
        novo: orders.filter(o => o.status === 'NOVO').length,
        em_preparo: orders.filter(o => o.status === 'EM_PREPARO').length,
        pronto: orders.filter(o => o.status === 'PRONTO').length,
        retirado: orders.filter(o => o.status === 'RETIRADO').length,
        cancelado: orders.filter(o => o.status === 'CANCELADO').length,
      };

      const totalGMV = orders
        .filter(o => o.status !== 'CANCELADO')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return NextResponse.json({
        activeVendors: vendorsCount,
        totalOrders: orders.length,
        totalGMV: Math.round(totalGMV * 100) / 100,
        subscribersCount,
        ordersByStatus,
      });
    }
  } catch (err) {
    console.warn('Prisma admin stats fallback:', err);
  }

  const stats = store.getAdminStats();
  return NextResponse.json(stats);
}
