import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const dateFilter = searchParams.get('date') || 'ALL';

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Parâmetro vendorId é obrigatório.' },
        { status: 400 }
      );
    }

    // Attempt Prisma query
    try {
      const dbVendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      if (dbVendor) {
        const isPro = dbVendor.plan === 'PRO' || dbVendor.isSubscriber || dbVendor.commissionRate === 0;
        const commissionRate = isPro ? 0 : (dbVendor.commissionRate || 0.05);

        // Fetch all completed/settled orders for date discovery and 4-fairs history
        const allDbOrders = await prisma.order.findMany({
          where: {
            vendorId,
            status: 'RETIRADO',
          },
          include: {
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        const datesSet = new Set<string>();
        allDbOrders.forEach(o => {
          if (o.pickupDate) datesSet.add(o.pickupDate);
        });
        const availableDates = Array.from(datesSet);

        // Filter orders by date if requested
        const filteredOrders = dateFilter !== 'ALL'
          ? allDbOrders.filter(o => o.pickupDate === dateFilter || o.pickupDate.includes(dateFilter))
          : allDbOrders;

        const totalGross = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const totalCommission = Number((totalGross * commissionRate).toFixed(2));
        const totalNet = Number((totalGross - totalCommission).toFixed(2));

        const paidAtPickup = filteredOrders
          .filter(o => o.paymentMethod === 'RETIRADA')
          .reduce((sum, o) => sum + o.totalAmount, 0);

        const paidOnline = filteredOrders
          .filter(o => o.paymentMethod === 'MERCADO_PAGO_PIX' || o.paymentMethod === 'MERCADO_PAGO_CARTAO')
          .reduce((sum, o) => sum + o.totalAmount, 0);

        const averageTicket = filteredOrders.length > 0 ? totalGross / filteredOrders.length : 0;

        const orders = filteredOrders.map(o => {
          const comm = Number((o.totalAmount * commissionRate).toFixed(2));
          const net = Number((o.totalAmount - comm).toFixed(2));
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            clientName: o.clientName,
            clientPhone: o.clientPhone,
            totalAmount: o.totalAmount,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            pickupDate: o.pickupDate,
            createdAt: o.createdAt.toISOString ? o.createdAt.toISOString() : String(o.createdAt),
            commission: comm,
            net,
            itemsCount: o.items ? o.items.length : 0,
          };
        });

        // 4 fairs evolution
        const fairsMap = new Map<string, { totalGross: number; totalNet: number; orderCount: number }>();
        allDbOrders.forEach(o => {
          const dateKey = o.pickupDate || 'Feira';
          const existing = fairsMap.get(dateKey) || { totalGross: 0, totalNet: 0, orderCount: 0 };
          const comm = Number((o.totalAmount * commissionRate).toFixed(2));
          existing.totalGross += o.totalAmount;
          existing.totalNet += (o.totalAmount - comm);
          existing.orderCount += 1;
          fairsMap.set(dateKey, existing);
        });

        let recentFairs = Array.from(fairsMap.entries()).map(([date, stats]) => ({
          date,
          totalGross: Number(stats.totalGross.toFixed(2)),
          totalNet: Number(stats.totalNet.toFixed(2)),
          orderCount: stats.orderCount,
        }));

        if (recentFairs.length > 4) {
          recentFairs = recentFairs.slice(-4);
        }

        return NextResponse.json({
          vendor: {
            id: dbVendor.id,
            businessName: dbVendor.businessName,
            isPro,
            commissionRate,
            plan: isPro ? 'PRO' : 'FREE',
          },
          dateFilter,
          totalGross: Number(totalGross.toFixed(2)),
          totalCommission: Number(totalCommission.toFixed(2)),
          totalNet: Number(totalNet.toFixed(2)),
          paidAtPickup: Number(paidAtPickup.toFixed(2)),
          paidOnline: Number(paidOnline.toFixed(2)),
          averageTicket: Number(averageTicket.toFixed(2)),
          totalOrdersCount: filteredOrders.length,
          availableDates,
          recentFairs,
          orders,
        });
      }
    } catch (prismaErr) {
      console.warn('Prisma /api/vendors/finance/stats fallback to store:', prismaErr);
    }

    // Fallback to in-memory store
    if (typeof store.getVendorFinancialStats === 'function') {
      const stats = store.getVendorFinancialStats(vendorId, dateFilter);
      return NextResponse.json(stats);
    }

    return NextResponse.json(
      { error: 'Não foi possível carregar os dados financeiros.' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Error in /api/vendors/finance/stats:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar extrato financeiro.' },
      { status: 500 }
    );
  }
}
