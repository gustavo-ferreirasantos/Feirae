export type Role = 'CLIENT' | 'VENDOR' | 'ADMIN';

export type OrderStatus = 'NOVO' | 'EM_PREPARO' | 'PRONTO' | 'RETIRADO' | 'CANCELADO';

export type PaymentMethod = 'RETIRADA' | 'MERCADO_PAGO_PIX' | 'MERCADO_PAGO_CARTAO';

export type PaymentStatus = 'PENDENTE' | 'SIMULADO_APROVADO' | 'PAGO_NA_RETIRADA' | 'CANCELADO';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsappPhone?: string;
  role: Role;
}

export type VendorPlan = 'FREE' | 'PRO';

export interface FairLocation {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  schedule: string;
  operatingDays: string | string[];
  imageUrl?: string;
  active: boolean;
  vendorCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorFairLocation {
  id: string;
  vendorId: string;
  fairLocationId: string;
  fairLocation?: FairLocation;
  boothNumber?: string;
  assignedDays?: string;
  active: boolean;
}

export type CertStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  description: string;
  category: string;
  fairLocation: string;
  boothNumber?: string;
  whatsappPhone?: string;
  coverImage?: string;
  avatar?: string;
  rating: number;
  ratingCount: number;
  plan?: VendorPlan;
  maxProducts?: number;
  isSubscriber: boolean;
  commissionRate: number;
  isFeatured?: boolean;
  featuredUntil?: string | null;
  featuredOrder?: number;
  isCertifiedOrganic?: boolean;
  certificationDocUrl?: string | null;
  certStatus?: CertStatus;
  certRegistrationNumber?: string | null;
  certIssuingBody?: string | null;
  certSubmittedAt?: string | null;
  certReviewedAt?: string | null;
  certRejectionReason?: string | null;
  active: boolean;
  fairLocations?: VendorFairLocation[];
}

export interface Product {
  id: string;
  vendorId: string;
  vendorName?: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  imageUrl?: string;
  isOrganic: boolean;
  isWeighable?: boolean;
  isActive: boolean;
}

export interface PickupWindow {
  id: string;
  vendorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  fairLocationId?: string;
  fairLocation?: FairLocation;
  maxOrders: number;
  active: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productUnit: string;
  unitPrice: number;
  quantity: number;
  measuredWeight?: number | null;
  subtotal: number;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  vendorId?: string | null;
  vendor?: { id?: string; businessName?: string };
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  vendorId: string;
  vendorName?: string;
  vendorPhone?: string;
  vendor?: {
    id: string;
    businessName: string;
    fairLocation?: string;
    whatsappPhone?: string;
  };
  totalAmount: number;
  couponCode?: string;
  discountAmount?: number;
  originalAmount?: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  mpPaymentId?: string;
  pickupWindowId?: string;
  pickupDate: string;
  pickupLocation: string;
  notes?: string;
  createdAt: string;
  items: OrderItem[];
  review?: Review;
}

export interface Review {
  id: string;
  orderId: string;
  vendorId: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment?: string;
  vendorReply?: string | null;
  vendorReplyAt?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER_STATUS' | 'NEW_ORDER' | 'ORDER_CANCELLED' | 'REVIEW_REPLY' | 'SYSTEM';
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PeriodFilter = '7d' | '30d' | 'all' | 'custom';

export interface ProductFunnelMetrics {
  showcaseViews: number;
  cartAdditions: number;
  ordersCreated: number;
  ordersCompleted: number;
  viewsToCartRate: number;
  cartToOrderRate: number;
  orderToCompletedRate: number;
  overallConversionRate: number;
}

export interface VendorActivationItem {
  id: string;
  businessName: string;
  category: string;
  activeProductsCount: number;
  isActivated: boolean;
}

export interface VendorActivationMetrics {
  totalVendors: number;
  activatedVendors: number;
  pendingVendors: number;
  activationRate: number;
  vendorsBreakdown: VendorActivationItem[];
}

export interface CustomerRetentionItem {
  name: string;
  email: string;
  ordersCount: number;
  differentDatesCount: number;
  hasConsecutiveWeeks: boolean;
  consecutiveWeeksCount: number;
  lastOrderDate: string;
  weeksActive: string[];
}

export interface CustomerRetentionMetrics {
  totalCustomers: number;
  repeatCustomersCount: number;
  consecutiveWeeksCustomersCount: number;
  retentionRate: number;
  consecutiveRetentionRate: number;
  customers: CustomerRetentionItem[];
}

export interface ProductAnalyticsData {
  period: PeriodFilter;
  funnel: ProductFunnelMetrics;
  activation: VendorActivationMetrics;
  retention: CustomerRetentionMetrics;
}

export interface AdminStats {
  activeVendors: number;
  totalProducts?: number;
  totalOrders: number;
  totalGMV: number;
  subscribersCount: number;
  simulatedCommissionTotal?: number;
  subscriptionTotal?: number;
  featuredVendorsCount: number;
  sponsorshipRevenue: number;
  totalMonetizationEstimate: number;
  ordersByStatus: {
    novo: number;
    em_preparo: number;
    pronto: number;
    retirado: number;
    cancelado: number;
  };
  productAnalytics: ProductAnalyticsData;
}
