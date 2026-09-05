import { 
  INITIAL_USERS, 
  INITIAL_VENDORS, 
  INITIAL_PRODUCTS, 
  INITIAL_PICKUP_WINDOWS, 
  INITIAL_ORDERS, 
  INITIAL_REVIEWS, 
  INITIAL_NOTIFICATIONS,
  INITIAL_COUPONS
} from './mock-data';
import { User, Vendor, Product, PickupWindow, Order, Notification, Review, Coupon, OrderStatus } from '@/types';

// In-memory persistent state (shared across API routes during server lifecycle)
class MemoryStore {
  users: User[] = [...INITIAL_USERS];
  vendors: Vendor[] = [...INITIAL_VENDORS];
  products: Product[] = [...INITIAL_PRODUCTS];
  pickupWindows: PickupWindow[] = [...INITIAL_PICKUP_WINDOWS];
  orders: Order[] = [...INITIAL_ORDERS];
  reviews: Review[] = [...INITIAL_REVIEWS];
  notifications: Notification[] = [...INITIAL_NOTIFICATIONS];
  coupons: Coupon[] = [...INITIAL_COUPONS];

  getCoupons(vendorId?: string): Coupon[] {
    return this.coupons.filter(c => {
      if (!c.active) return false;
      if (vendorId && c.vendorId && c.vendorId !== vendorId) return false;
      return true;
    });
  }

  getCouponByCode(code: string): Coupon | undefined {
    const formatted = code.trim().toUpperCase();
    return this.coupons.find(c => c.code.toUpperCase() === formatted);
  }

  validateCoupon(
    code: string, 
    cartTotal: number, 
    vendorId?: string
  ): { valid: boolean; coupon?: Coupon; discountAmount?: number; finalTotal?: number; error?: string } {
    const coupon = this.getCouponByCode(code);

    if (!coupon) {
      return { valid: false, error: 'Cupom não encontrado ou inválido.' };
    }

    if (!coupon.active) {
      return { valid: false, error: 'Este cupom não está mais ativo.' };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: 'Este cupom está expirado.' };
    }

    if (coupon.maxUses !== undefined && coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: 'Este cupom já atingiu o limite máximo de utilizações.' };
    }

    if (cartTotal < coupon.minOrderValue) {
      return { 
        valid: false, 
        error: `O valor mínimo para utilizar este cupom é de R$ ${coupon.minOrderValue.toFixed(2).replace('.', ',')}.` 
      };
    }

    if (coupon.vendorId && vendorId && coupon.vendorId !== vendorId) {
      return { valid: false, error: 'Este cupom é exclusivo para outra banca de feirante.' };
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((cartTotal * (coupon.discountValue / 100)) * 100) / 100;
    } else {
      discountAmount = Math.min(cartTotal, coupon.discountValue);
    }

    const finalTotal = Math.max(0, Math.round((cartTotal - discountAmount) * 100) / 100);

    return {
      valid: true,
      coupon,
      discountAmount,
      finalTotal,
    };
  }

  getVendors(): Vendor[] {
    return this.vendors.filter(v => v.active);
  }

  getFeaturedVendors(): Vendor[] {
    return this.vendors
      .filter(v => {
        if (!v.active || !v.isFeatured) return false;
        if (v.featuredUntil && new Date(v.featuredUntil).getTime() < Date.now()) return false;
        return true;
      })
      .sort((a, b) => {
        const orderA = a.featuredOrder ?? 999;
        const orderB = b.featuredOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return b.rating - a.rating;
      });
  }

  getVendorById(id: string): Vendor | undefined {
    return this.vendors.find(v => v.id === id || v.slug === id);
  }

  updateVendor(id: string, updates: Partial<Vendor>): Vendor | undefined {
    const index = this.vendors.findIndex(v => v.id === id || v.slug === id);
    if (index === -1) return undefined;
    this.vendors[index] = { ...this.vendors[index], ...updates };
    return this.vendors[index];
  }

  toggleVendorPlan(vendorId: string): Vendor | undefined {
    const vendor = this.getVendorById(vendorId);
    if (!vendor) return undefined;
    const isPro = vendor.plan === 'PRO' || vendor.isSubscriber;
    const updates: Partial<Vendor> = {
      plan: isPro ? 'FREE' : 'PRO',
      isSubscriber: !isPro,
      maxProducts: !isPro ? 9999 : 5,
      commissionRate: !isPro ? 0 : 0.05,
    };
    return this.updateVendor(vendorId, updates);
  }

  getProducts(vendorId?: string, category?: string, search?: string): Product[] {
    return this.products.filter(p => {
      if (!p.isActive) return false;
      if (vendorId) {
        if (p.vendorId !== vendorId) return false;
      } else {
        const vendor = this.getVendorById(p.vendorId);
        if (!vendor || vendor.active === false) return false;
      }
      if (category && category !== 'Todos' && p.category.toLowerCase() !== category.toLowerCase()) return false;
      if (search) {
        const query = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchDesc = p.description.toLowerCase().includes(query);
        const matchCategory = p.category.toLowerCase().includes(query);
        const matchVendor = p.vendorName?.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCategory && !matchVendor) return false;
      }
      return true;
    });
  }

  getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  addProduct(productData: Omit<Product, 'id'>): Product {
    const vendor = this.getVendorById(productData.vendorId);
    
    // Check Freemium Product Limit
    const activeProductsCount = this.products.filter(p => p.vendorId === productData.vendorId && p.isActive).length;
    const isPro = vendor?.plan === 'PRO' || vendor?.isSubscriber;
    const maxLimit = vendor?.maxProducts || 5;

    if (!isPro && activeProductsCount >= maxLimit) {
      throw new Error(`Limite de ${maxLimit} produtos do Plano Gratuito atingido. Faça upgrade para o Plano Feirante Pro para produtos ilimitados!`);
    }

    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      vendorName: vendor?.businessName || 'Feirante',
    };
    this.products.unshift(newProduct);
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    this.products[index] = { ...this.products[index], ...updates };
    return this.products[index];
  }

  deleteProduct(id: string): boolean {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.products[index].isActive = false;
    return true;
  }

  getPickupWindows(vendorId: string): PickupWindow[] {
    return this.pickupWindows.filter(pw => pw.vendorId === vendorId && pw.active);
  }

  getOrders(params?: { clientId?: string; vendorId?: string }): Order[] {
    return this.orders.filter(o => {
      if (params?.clientId && o.clientId !== params.clientId) return false;
      if (params?.vendorId && o.vendorId !== params.vendorId) return false;
      return true;
    });
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find(o => o.id === id || o.orderNumber === id);
  }

  createOrder(orderData: {
    clientId: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    vendorId: string;
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod: 'RETIRADA' | 'MERCADO_PAGO_PIX' | 'MERCADO_PAGO_CARTAO';
    pickupDate: string;
    pickupLocation: string;
    notes?: string;
    couponCode?: string;
  }): { success: boolean; order?: Order; error?: string } {
    const vendor = this.getVendorById(orderData.vendorId);
    if (!vendor) return { success: false, error: 'Feirante não encontrado.' };

    // Validate stock and prepare items
    const orderItems = [];
    let subtotalAmount = 0;

    for (const item of orderData.items) {
      const product = this.getProductById(item.productId);
      if (!product) {
        return { success: false, error: `Produto ${item.productId} não encontrado.` };
      }
      if (product.stock < item.quantity) {
        return { 
          success: false, 
          error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}` 
        };
      }

      const subtotal = product.price * item.quantity;
      subtotalAmount += subtotal;

      orderItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        orderId: '',
        productId: product.id,
        productName: product.name,
        productUnit: product.unit,
        unitPrice: product.price,
        quantity: item.quantity,
        measuredWeight: null,
        subtotal: subtotal,
      });
    }

    let finalTotal = Math.round(subtotalAmount * 100) / 100;
    let discountAmount = 0;
    let appliedCouponCode: string | undefined = undefined;

    if (orderData.couponCode) {
      const valResult = this.validateCoupon(orderData.couponCode, subtotalAmount, orderData.vendorId);
      if (!valResult.valid) {
        return { success: false, error: valResult.error || 'Cupom inválido.' };
      }
      appliedCouponCode = valResult.coupon?.code;
      discountAmount = valResult.discountAmount || 0;
      finalTotal = valResult.finalTotal || 0;

      if (valResult.coupon) {
        valResult.coupon.usedCount += 1;
      }
    }

    // Decrement stock (US08)
    for (const item of orderData.items) {
      const product = this.getProductById(item.productId);
      if (product) {
        product.stock -= item.quantity;
      }
    }

    const orderId = `order-${Date.now()}`;
    const orderNum = `FL-2026-${String(this.orders.length + 1).padStart(3, '0')}`;

    const newOrder: Order = {
      id: orderId,
      orderNumber: orderNum,
      clientId: orderData.clientId,
      clientName: orderData.clientName,
      clientPhone: orderData.clientPhone,
      clientEmail: orderData.clientEmail,
      vendorId: orderData.vendorId,
      vendorName: vendor.businessName,
      totalAmount: finalTotal,
      couponCode: appliedCouponCode,
      discountAmount: discountAmount,
      originalAmount: Math.round(subtotalAmount * 100) / 100,
      status: 'NOVO',
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentMethod === 'RETIRADA' ? 'PAGO_NA_RETIRADA' : 'PENDENTE',
      pickupDate: orderData.pickupDate,
      pickupLocation: orderData.pickupLocation,
      notes: orderData.notes,
      createdAt: new Date().toISOString(),
      items: orderItems.map(i => ({ ...i, orderId })),
    };

    this.orders.unshift(newOrder);

    // Notify vendor
    this.addNotification({
      userId: vendor.userId,
      title: 'Novo Pré-pedido Recebido!',
      message: `${orderData.clientName} realizou o pedido #${orderNum} no valor de R$ ${newOrder.totalAmount.toFixed(2)}.`,
      type: 'NEW_ORDER',
      orderId: newOrder.id,
    });

    // Notify client
    this.addNotification({
      userId: orderData.clientId,
      title: 'Pré-pedido Confirmado!',
      message: `Seu pedido #${orderNum} foi enviado para ${vendor.businessName}. Retirada: ${orderData.pickupDate}.`,
      type: 'ORDER_STATUS',
      orderId: newOrder.id,
    });

    return { success: true, order: newOrder };
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Order | undefined {
    const order = this.getOrderById(orderId);
    if (!order) return undefined;

    const oldStatus = order.status;
    order.status = status;

    if (status === 'CANCELADO' && oldStatus !== 'CANCELADO') {
      // Restore stock upon cancellation (US10)
      for (const item of order.items) {
        const product = this.getProductById(item.productId);
        if (product) {
          product.stock += item.quantity;
        }
      }
    }

    const statusLabels: Record<OrderStatus, string> = {
      NOVO: 'recebido e está aguardando preparo',
      EM_PREPARO: 'sendo separado e embalado',
      PRONTO: 'pronto para retirada na feira!',
      RETIRADO: 'marcado como retirado com sucesso',
      CANCELADO: 'cancelado',
    };

    // Send notification to client
    this.addNotification({
      userId: order.clientId,
      title: `Pedido #${order.orderNumber} Atualizado`,
      message: `Seu pedido na ${order.vendorName} agora está ${statusLabels[status]}.`,
      type: 'ORDER_STATUS',
      orderId: order.id,
    });

    return order;
  }

  updateOrderItemWeight(orderId: string, itemId: string, measuredWeight: number): Order | undefined {
    const order = this.getOrderById(orderId);
    if (!order) return undefined;

    const item = order.items.find(it => it.id === itemId);
    if (!item) return undefined;

    item.measuredWeight = Number(measuredWeight);
    item.subtotal = Number((item.unitPrice * Number(measuredWeight)).toFixed(2));

    // Recalculate totalAmount
    const itemsTotal = order.items.reduce((sum, it) => sum + (it.subtotal || it.unitPrice * it.quantity), 0);
    const discount = order.discountAmount || 0;
    order.totalAmount = Number(Math.max(0, itemsTotal - discount).toFixed(2));

    return order;
  }

  cancelOrder(orderId: string, clientId: string): { success: boolean; error?: string } {
    const order = this.getOrderById(orderId);
    if (!order) return { success: false, error: 'Pedido não encontrado.' };
    if (order.clientId !== clientId) return { success: false, error: 'Acesso não autorizado.' };
    if (order.status === 'PRONTO' || order.status === 'RETIRADO') {
      return { success: false, error: 'Não é possível cancelar um pedido que já está pronto ou retirado.' };
    }

    this.updateOrderStatus(orderId, 'CANCELADO');

    // Notify vendor about cancellation
    const vendor = this.getVendorById(order.vendorId);
    if (vendor) {
      this.addNotification({
        userId: vendor.userId,
        title: 'Pedido Cancelado pelo Cliente',
        message: `O pedido #${order.orderNumber} de ${order.clientName} foi cancelado e o estoque foi estornado.`,
        type: 'ORDER_CANCELLED',
        orderId: order.id,
      });
    }

    return { success: true };
  }

  addReview(reviewData: {
    orderId: string;
    vendorId: string;
    clientId: string;
    clientName: string;
    rating: number;
    comment?: string;
  }): Review | { error: string } {
    const order = this.getOrderById(reviewData.orderId);
    if (!order) return { error: 'Pedido não encontrado.' };
    if (order.status !== 'RETIRADO') {
      return { error: 'Você só pode avaliar pedidos que já foram retirados.' };
    }

    const existing = this.reviews.find(r => r.orderId === reviewData.orderId);
    if (existing) return { error: 'Este pedido já foi avaliado.' };

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      ...reviewData,
      createdAt: new Date().toISOString(),
    };

    this.reviews.unshift(newReview);
    order.review = newReview;

    // Recalculate vendor rating
    const vendorReviews = this.reviews.filter(r => r.vendorId === reviewData.vendorId);
    const vendor = this.getVendorById(reviewData.vendorId);
    if (vendor && vendorReviews.length > 0) {
      const avg = vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length;
      vendor.rating = Math.round(avg * 10) / 10;
      vendor.ratingCount = vendorReviews.length;
    }

    return newReview;
  }

  getReviews(vendorId?: string): Review[] {
    if (vendorId) {
      return this.reviews.filter(r => r.vendorId === vendorId);
    }
    return this.reviews;
  }

  getNotifications(userId: string): Notification[] {
    return this.notifications.filter(n => n.userId === userId);
  }

  addNotification(data: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    const newNotif: Notification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(newNotif);
    return newNotif;
  }

  markNotificationAsRead(id: string): boolean {
    const notif = this.notifications.find(n => n.id === id);
    if (!notif) return false;
    notif.read = true;
    return true;
  }

  getAdminStats() {
    const totalOrders = this.orders.length;
    const activeVendors = this.vendors.filter(v => v.active).length;
    const totalProducts = this.products.filter(p => p.isActive).length;
    const totalVolume = this.orders
      .filter(o => o.status !== 'CANCELADO')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Calculate simulated commissions & sponsorships
    let simulatedCommissionTotal = 0;
    let subscriptionTotal = 0;

    this.vendors.forEach(v => {
      if (v.isSubscriber) {
        subscriptionTotal += 49.90; // R$ 49,90/mês simulado
      } else {
        const vendorOrders = this.orders.filter(
          o => o.vendorId === v.id && o.status !== 'CANCELADO'
        );
        const vendorVolume = vendorOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        simulatedCommissionTotal += vendorVolume * (v.commissionRate || 0.05);
      }
    });

    const featuredVendorsCount = this.vendors.filter(
      v => v.active && v.isFeatured && (!v.featuredUntil || new Date(v.featuredUntil).getTime() >= Date.now())
    ).length;
    const sponsorshipRevenue = featuredVendorsCount * 29.90; // R$ 29,90 simulado por destaque

    return {
      activeVendors,
      totalProducts,
      totalOrders,
      totalVolume,
      simulatedCommissionTotal,
      subscriptionTotal,
      featuredVendorsCount,
      sponsorshipRevenue,
      totalMonetizationEstimate: simulatedCommissionTotal + subscriptionTotal + sponsorshipRevenue,
      ordersByStatus: {
        novo: this.orders.filter(o => o.status === 'NOVO').length,
        em_preparo: this.orders.filter(o => o.status === 'EM_PREPARO').length,
        pronto: this.orders.filter(o => o.status === 'PRONTO').length,
        retirado: this.orders.filter(o => o.status === 'RETIRADO').length,
        cancelado: this.orders.filter(o => o.status === 'CANCELADO').length,
      }
    };
  }

  getVendorFinancialStats(vendorId: string, dateFilter?: string) {
    const vendor = this.getVendorById(vendorId);
    const isPro = vendor ? (vendor.plan === 'PRO' || vendor.isSubscriber || vendor.commissionRate === 0) : false;
    const commissionRate = isPro ? 0 : (vendor?.commissionRate ?? 0.05);

    // Filter vendor orders with RETIRADO status (completed/settled sales)
    const allVendorOrders = this.orders.filter(
      o => o.vendorId === vendorId && o.status === 'RETIRADO'
    );

    // Extract available dates for filter dropdown
    const datesSet = new Set<string>();
    allVendorOrders.forEach(o => {
      if (o.pickupDate) {
        datesSet.add(o.pickupDate);
      }
    });
    const availableDates = Array.from(datesSet);

    // Filter by date if specified and not 'ALL'
    const filteredOrders = dateFilter && dateFilter !== 'ALL'
      ? allVendorOrders.filter(o => o.pickupDate === dateFilter || o.pickupDate.includes(dateFilter))
      : allVendorOrders;

    // Financial Metrics
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

    // Detailed statement items
    const orders = filteredOrders.map(o => {
      const commission = Number((o.totalAmount * commissionRate).toFixed(2));
      const net = Number((o.totalAmount - commission).toFixed(2));
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        clientName: o.clientName,
        clientPhone: o.clientPhone,
        totalAmount: o.totalAmount,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        pickupDate: o.pickupDate,
        createdAt: o.createdAt,
        commission,
        net,
        itemsCount: o.items ? o.items.length : 0,
      };
    });

    // Recent 4 fairs revenue evolution (using allVendorOrders)
    const fairsMap = new Map<string, { totalGross: number; totalNet: number; orderCount: number }>();
    allVendorOrders.forEach(o => {
      const dateKey = o.pickupDate || 'Outra Data';
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

    if (recentFairs.length === 0) {
      recentFairs = [
        { date: '15/08/2026', totalGross: 0, totalNet: 0, orderCount: 0 },
        { date: '22/08/2026', totalGross: 0, totalNet: 0, orderCount: 0 },
        { date: '29/08/2026', totalGross: 0, totalNet: 0, orderCount: 0 },
        { date: '05/09/2026', totalGross: 0, totalNet: 0, orderCount: 0 },
      ];
    } else if (recentFairs.length > 4) {
      recentFairs = recentFairs.slice(-4);
    }

    return {
      vendor: {
        id: vendor?.id || vendorId,
        businessName: vendor?.businessName || 'Feirante',
        isPro,
        commissionRate,
        plan: isPro ? 'PRO' : 'FREE',
      },
      dateFilter: dateFilter || 'ALL',
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
    };
  }
}

// Global Singleton for in-memory store
const globalStore = globalThis as unknown as { appStore?: MemoryStore };
export const store = globalStore.appStore ?? new MemoryStore();
if (process.env.NODE_ENV !== 'production') {
  if (globalStore.appStore) {
    Object.setPrototypeOf(globalStore.appStore, MemoryStore.prototype);
    // Ensure newly added mock orders from INITIAL_ORDERS are merged
    INITIAL_ORDERS.forEach(initialOrder => {
      if (!globalStore.appStore!.orders.some(o => o.id === initialOrder.id)) {
        globalStore.appStore!.orders.push({ ...initialOrder });
      }
    });
    // Sync product weighable flags
    INITIAL_PRODUCTS.forEach(ip => {
      const existing = globalStore.appStore!.products.find(p => p.id === ip.id);
      if (existing && ip.isWeighable !== undefined) {
        existing.isWeighable = ip.isWeighable;
      }
    });
  } else {
    globalStore.appStore = store;
  }
}
