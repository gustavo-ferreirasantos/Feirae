'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store, 
  Layers, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Edit3, 
  Trash2, 
  Plus, 
  X, 
  Loader2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Tag,
  Calendar,
  Star,
  MessageSquare,
  ShoppingBag,
  Search,
  Award,
  Sparkles,
  FileSpreadsheet,
  Printer,
  Wallet,
  CreditCard,
  Banknote,
  RefreshCw
} from 'lucide-react';
import { Order, Product, Vendor, OrderStatus, PickupWindow, Review } from '@/types';
import { useUser } from '@/lib/user-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OrderKanban } from '@/components/OrderKanban';
import { StarRating } from '@/components/StarRating';
import { LoginModal } from '@/components/LoginModal';

interface FinancialStats {
  vendor: {
    id: string;
    businessName: string;
    isPro: boolean;
    commissionRate: number;
    plan: 'FREE' | 'PRO';
  };
  dateFilter: string;
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  paidAtPickup: number;
  paidOnline: number;
  averageTicket: number;
  totalOrdersCount: number;
  availableDates: string[];
  recentFairs: Array<{
    date: string;
    totalGross: number;
    totalNet: number;
    orderCount: number;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    clientName: string;
    clientPhone: string;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    pickupDate: string;
    createdAt: string;
    commission: number;
    net: number;
    itemsCount: number;
  }>;
}

export default function VendorDashboardPage() {
  const { currentUser, currentVendor, updateCurrentVendor } = useUser();
  const [activeTab, setActiveTab] = useState<'KANBAN' | 'AUDIT' | 'PRODUCTS' | 'WINDOWS' | 'REVIEWS' | 'FINANCIAL'>('KANBAN');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pickupWindows, setPickupWindows] = useState<PickupWindow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Orders Audit Filter State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Login Modal for unauthorized users
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Financial Tab State (US20)
  const [financeData, setFinanceData] = useState<FinancialStats | null>(null);
  const [financeDateFilter, setFinanceDateFilter] = useState<string>('ALL');
  const [loadingFinance, setLoadingFinance] = useState(false);

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Hortaliças');
  const [formUnit, setFormUnit] = useState('kg');
  const [formPrice, setFormPrice] = useState('5.00');
  const [formStock, setFormStock] = useState('20');
  const [formImage, setFormImage] = useState('');
  const [formOrganic, setFormOrganic] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Bio & Barraca Modal State
  const [showBioModal, setShowBioModal] = useState(false);
  const [bioDesc, setBioDesc] = useState('');
  const [bioLocation, setBioLocation] = useState('');
  const [bioBoothNumber, setBioBoothNumber] = useState('');
  const [bioCategory, setBioCategory] = useState('');
  const [bioWhatsappPhone, setBioWhatsappPhone] = useState('87998018279');
  const [savingBio, setSavingBio] = useState(false);
  const [bioSuccessFeedback, setBioSuccessFeedback] = useState<string | null>(null);

  // Pickup Window Modal State
  const [showWindowModal, setShowWindowModal] = useState(false);
  const [winDay, setWinDay] = useState('Sábado');
  const [winStart, setWinStart] = useState('07:30');
  const [winEnd, setWinEnd] = useState('11:30');
  const [winLoc, setWinLoc] = useState('');
  const [winMax, setWinMax] = useState('30');
  const [savingWindow, setSavingWindow] = useState(false);

  // Plan Toggle State
  const [togglingPlan, setTogglingPlan] = useState(false);

  // Featured / Sponsorship Toggle State (US19)
  const [togglingFeatured, setTogglingFeatured] = useState(false);
  const [featuredSuccessMsg, setFeaturedSuccessMsg] = useState<string | null>(null);

  const isVendor = currentUser?.role === 'VENDOR';
  const activeVendorId = currentVendor?.id || 'vendor-1';

  // Synchronize bio modal initial state when currentVendor changes
  useEffect(() => {
    if (currentVendor) {
      setBioDesc(currentVendor.description || '');
      setBioLocation(currentVendor.fairLocation || '');
      setBioBoothNumber(currentVendor.boothNumber || '');
      setBioCategory(currentVendor.category || 'Hortifrúti');
      setBioWhatsappPhone(currentVendor.whatsappPhone || '87998018279');
      setWinLoc(currentVendor.fairLocation || 'Feira Livre da Praça da Matriz');
    }
  }, [currentVendor]);

  const loadVendorData = async () => {
    if (!isVendor) {
      setLoading(false);
      return;
    }
    try {
      const [ordRes, prodRes, winRes, revRes] = await Promise.all([
        fetch('/api/orders?vendorId=' + activeVendorId),
        fetch('/api/products?vendorId=' + activeVendorId),
        fetch(`/api/vendors/${activeVendorId}/pickup-windows`),
        fetch(`/api/reviews?vendorId=${activeVendorId}`),
      ]);
      if (ordRes.ok) setOrders(await ordRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (winRes.ok) setPickupWindows(await winRes.json());
      if (revRes.ok) setReviews(await revRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinanceStats = async (date: string = financeDateFilter) => {
    if (!isVendor) return;
    setLoadingFinance(true);
    try {
      const url = `/api/vendors/finance/stats?vendorId=${activeVendorId}${date !== 'ALL' ? `&date=${encodeURIComponent(date)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFinanceData(data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoadingFinance(false);
    }
  };

  const handleExportCSV = () => {
    if (!financeData || !financeData.orders.length) {
      alert('Não há lançamentos de pedidos para exportar no período selecionado.');
      return;
    }

    const isPro = financeData.vendor.isPro;
    const commRateStr = isPro ? '0%' : `${(financeData.vendor.commissionRate * 100).toFixed(0)}%`;

    const headers = [
      'Codigo Pedido',
      'Data da Feira',
      'Data/Hora Pedido',
      'Cliente',
      'Telefone',
      'Metodo de Pagamento',
      'Status Pagamento',
      'Valor Bruto (R$)',
      `Taxa Plataforma (${commRateStr}) (R$)`,
      'Valor Liquido (R$)'
    ];

    const rows = financeData.orders.map(o => {
      const methodLabel = o.paymentMethod === 'RETIRADA' 
        ? 'No Ato (Dinheiro/Pix Barraca)' 
        : o.paymentMethod === 'MERCADO_PAGO_PIX' 
          ? 'App (Mercado Pago Pix)' 
          : 'App (Mercado Pago Cartão)';
      const dateFormatted = new Date(o.createdAt).toLocaleString('pt-BR');
      return [
        `"${o.orderNumber}"`,
        `"${o.pickupDate || '-'}"`,
        `"${dateFormatted}"`,
        `"${o.clientName.replace(/"/g, '""')}"`,
        `"${o.clientPhone || '-'}"`,
        `"${methodLabel}"`,
        `"${o.paymentStatus}"`,
        o.totalAmount.toFixed(2).replace('.', ','),
        o.commission.toFixed(2).replace('.', ','),
        o.net.toFixed(2).replace('.', ',')
      ].join(';');
    });

    const summaryRow = [
      '"TOTAL CONSOLIDADO"',
      `"${financeDateFilter === 'ALL' ? 'Todas as Feiras' : financeDateFilter}"`,
      '""',
      `"${financeData.orders.length} pedidos"`,
      '""',
      '""',
      '""',
      financeData.totalGross.toFixed(2).replace('.', ','),
      financeData.totalCommission.toFixed(2).replace('.', ','),
      financeData.totalNet.toFixed(2).replace('.', ',')
    ].join(';');

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows, '', summaryRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedVendor = (financeData.vendor.businessName || 'feirante').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const sanitizedDate = financeDateFilter === 'ALL' ? 'consolidado' : financeDateFilter.replace(/\//g, '-');
    link.setAttribute('download', `extrato-fechamento-${sanitizedVendor}-${sanitizedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintStatement = () => {
    window.print();
  };

  useEffect(() => {
    loadVendorData();
    fetchFinanceStats(financeDateFilter);
  }, [activeVendorId, isVendor, financeDateFilter]);

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));

    try {
      const res = await fetch('/api/orders/' + orderId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
        fetchFinanceStats(financeDateFilter);
      } else {
        loadVendorData();
      }
    } catch (err) {
      console.error('Erro ao atualizar status do pedido:', err);
      loadVendorData();
    }
  };

  const handleTogglePlan = async () => {
    setTogglingPlan(true);
    try {
      const isPro = currentVendor?.plan === 'PRO' || currentVendor?.isSubscriber;
      const newPlan: 'FREE' | 'PRO' = isPro ? 'FREE' : 'PRO';
      const payload = {
        plan: newPlan,
        isSubscriber: !isPro,
        maxProducts: !isPro ? 9999 : 5,
        commissionRate: !isPro ? 0 : 0.05,
      };

      const res = await fetch(`/api/vendors/${activeVendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        updateCurrentVendor(payload);
        loadVendorData();
        fetchFinanceStats(financeDateFilter);
      }
    } catch (err) {
      console.error('Erro ao alterar plano:', err);
    } finally {
      setTogglingPlan(false);
    }
  };

  const handleToggleFeatured = async () => {
    setTogglingFeatured(true);
    setFeaturedSuccessMsg(null);
    try {
      const isCurrentlyFeatured = Boolean(currentVendor?.isFeatured);
      const nextFeatured = !isCurrentlyFeatured;
      const featuredUntil = nextFeatured 
        ? new Date(Date.now() + 86400000 * 7).toISOString()
        : null;

      const payload = {
        isFeatured: nextFeatured,
        featuredUntil,
      };

      const res = await fetch(`/api/vendors/${activeVendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        updateCurrentVendor(payload);
        loadVendorData();
        setFeaturedSuccessMsg(
          nextFeatured 
            ? '🎉 Destaque Patrocinado ativado com sucesso! Sua barraca agora está no topo da vitrine principal da feira.'
            : 'Destaque Patrocinado pausado.'
        );
        setTimeout(() => setFeaturedSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error('Erro ao alternar destaque patrocinado:', err);
    } finally {
      setTogglingFeatured(false);
    }
  };

  const openNewProductModal = () => {
    const isPro = currentVendor?.plan === 'PRO' || currentVendor?.isSubscriber;
    const activeCount = products.filter(p => p.isActive).length;
    const maxLimit = currentVendor?.maxProducts || 5;

    if (!isPro && activeCount >= maxLimit) {
      alert(`⚠️ Limite de ${maxLimit} produtos do Plano Gratuito atingido!\n\nFaça upgrade para o Plano Feirante Pro para cadastrar produtos ilimitados, obter a badge ⭐ Parceiro Pro e ter 0% de comissão por pedido!`);
      return;
    }

    setEditingProduct(null);
    setFormName('');
    setFormDesc('');
    setFormCategory('Hortaliças');
    setFormUnit('kg');
    setFormPrice('5.00');
    setFormStock('20');
    setFormImage('https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80');
    setFormOrganic(false);
    setShowProductModal(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDesc(product.description);
    setFormCategory(product.category);
    setFormUnit(product.unit);
    setFormPrice(String(product.price));
    setFormStock(String(product.stock));
    setFormImage(product.imageUrl || '');
    setFormOrganic(product.isOrganic);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const payload = {
        vendorId: activeVendorId,
        name: formName,
        description: formDesc,
        category: formCategory,
        unit: formUnit,
        price: parseFloat(formPrice),
        stock: parseInt(formStock, 10),
        imageUrl: formImage,
        isOrganic: formOrganic,
      };

      if (editingProduct) {
        await fetch('/api/products/' + editingProduct.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setShowProductModal(false);
      loadVendorData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Deseja realmente desativar este produto do seu catálogo?')) return;
    try {
      const res = await fetch('/api/products/' + productId, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadVendorData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBio(true);
    try {
      const payload = {
        description: bioDesc,
        fairLocation: bioLocation,
        boothNumber: bioBoothNumber,
        category: bioCategory,
        whatsappPhone: bioWhatsappPhone,
      };

      const res = await fetch(`/api/vendors/${activeVendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        updateCurrentVendor(payload);
        setBioSuccessFeedback('Bio e dados da barraca atualizados com sucesso!');
        setTimeout(() => {
          setShowBioModal(false);
          setBioSuccessFeedback(null);
        }, 1200);
      }
    } catch (err) {
      console.error('Erro ao salvar bio da barraca:', err);
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWindow(true);
    try {
      const payload = {
        dayOfWeek: winDay,
        startTime: winStart,
        endTime: winEnd,
        location: winLoc,
        maxOrders: parseInt(winMax, 10),
      };

      const res = await fetch(`/api/vendors/${activeVendorId}/pickup-windows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowWindowModal(false);
        loadVendorData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingWindow(false);
    }
  };

  const handleDeleteWindow = async (windowId: string) => {
    if (!confirm('Deseja desativar este horário de retirada?')) return;
    try {
      const res = await fetch(`/api/vendors/${activeVendorId}/pickup-windows?windowId=${windowId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadVendorData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Route Protection for Non-Vendors
  if (!isVendor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-3xl border border-amber-200/80 shadow-md space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Acesso Restrito a Feirantes</h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            Você está conectado como <strong>{currentUser?.name || 'Cliente / Visitante'}</strong>. Para gerenciar uma barraca e pedidos, faça login com uma conta de feirante.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              Fazer Login como Feirante
            </button>
          </div>
        </div>
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </div>
    );
  }

  const totalVolume = orders
    .filter(o => o.status?.toUpperCase() !== 'CANCELADO')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const activeOrdersCount = orders.filter(
    o => {
      const st = o.status?.toUpperCase();
      return st === 'NOVO' || st === 'EM_PREPARO' || st === 'PRONTO';
    }
  ).length;

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.clientName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.clientPhone?.includes(orderSearch);

    if (!matchesSearch) return false;
    if (orderStatusFilter !== 'ALL') return o.status?.toUpperCase() === orderStatusFilter;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-stone-900 text-base">
                {editingProduct ? 'Editar Produto' : 'Novo Produto para Catálogo'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-200/60 transition text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Queijo Meia Cura, Alface Crespa..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-feira-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Categoria</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-feira-500 focus:outline-none"
                  >
                    <option value="Hortaliças">Hortaliças</option>
                    <option value="Legumes">Legumes</option>
                    <option value="Frutas">Frutas</option>
                    <option value="Queijos">Queijos</option>
                    <option value="Panificação">Panificação</option>
                    <option value="Doces & Geleias">Doces & Geleias</option>
                    <option value="Laticínios">Laticínios</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Unidade de Venda</label>
                  <select
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-feira-500 focus:outline-none"
                  >
                    <option value="kg">Quilo (kg)</option>
                    <option value="maço">Maço</option>
                    <option value="unid">Unidade</option>
                    <option value="bandeja">Bandeja</option>
                    <option value="peça">Peça</option>
                    <option value="pote">Pote</option>
                    <option value="garrafa">Garrafa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Preço Demonstrativo (R$)</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-feira-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Estoque Disponível</label>
                  <input
                    type="number"
                    required
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-feira-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">URL da Imagem</label>
                <input
                  type="url"
                  value={formImage}
                  onChange={e => setFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-feira-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isOrganic"
                  checked={formOrganic}
                  onChange={e => setFormOrganic(e.target.checked)}
                  className="w-4 h-4 text-feira-600 rounded"
                />
                <label htmlFor="isOrganic" className="font-semibold text-stone-700 cursor-pointer">
                  Produto 100% Orgânico / Sem Agrotóxicos
                </label>
              </div>

              <div className="pt-3 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex-1 py-2.5 rounded-xl bg-feira-600 hover:bg-feira-700 text-white font-bold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-70 cursor-pointer"
                >
                  {savingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Bio & Barraca */}
      {showBioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-amber-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Editar Bio & Dados da Barraca</h3>
                  <p className="text-[11px] text-stone-500">Estas informações são exibidas na vitrine pública para os clientes</p>
                </div>
              </div>
              <button
                onClick={() => setShowBioModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-200/60 transition text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bioSuccessFeedback && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{bioSuccessFeedback}</span>
              </div>
            )}

            <form onSubmit={handleSaveBio} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Bio / Descrição da Barraca
                </label>
                <textarea
                  rows={4}
                  required
                  value={bioDesc}
                  onChange={e => setBioDesc(e.target.value)}
                  placeholder="Conte a história da sua produção, métodos sustentáveis, tradição familiar..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Categoria Principal</label>
                  <input
                    type="text"
                    required
                    value={bioCategory}
                    onChange={e => setBioCategory(e.target.value)}
                    placeholder="Ex: Hortifrúti, Queijos, Doces..."
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Número do Ponto / Barraca</label>
                  <input
                    type="text"
                    value={bioBoothNumber}
                    onChange={e => setBioBoothNumber(e.target.value)}
                    placeholder="Ex: B-14"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Localização na Feira</label>
                <input
                  type="text"
                  required
                  value={bioLocation}
                  onChange={e => setBioLocation(e.target.value)}
                  placeholder="Ex: Feira Livre da Praça da Matriz - Barraca 14"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">WhatsApp Comercial (para alertas e contato)</label>
                <input
                  type="text"
                  required
                  value={bioWhatsappPhone}
                  onChange={e => setBioWhatsappPhone(e.target.value)}
                  placeholder="Ex: (87) 99801-8279"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBioModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBio}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-70 cursor-pointer"
                >
                  {savingBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Bio & Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Janela de Horário */}
      {showWindowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-stone-900 text-base">Novo Horário de Retirada na Feira</h3>
              <button
                onClick={() => setShowWindowModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-200/60 transition text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWindow} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Dia da Semana</label>
                <select
                  value={winDay}
                  onChange={e => setWinDay(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Sábado">Sábado (Feira Principal)</option>
                  <option value="Domingo">Domingo</option>
                  <option value="Quarta-feira">Quarta-feira</option>
                  <option value="Quinta-feira">Quinta-feira</option>
                  <option value="Sexta-feira">Sexta-feira</option>
                  <option value="Terça-feira">Terça-feira</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Horário de Início</label>
                  <input
                    type="time"
                    required
                    value={winStart}
                    onChange={e => setWinStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Horário de Término</label>
                  <input
                    type="time"
                    required
                    value={winEnd}
                    onChange={e => setWinEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Limite Máximo de Pedidos</label>
                <input
                  type="number"
                  required
                  min={5}
                  max={200}
                  value={winMax}
                  onChange={e => setWinMax(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Ponto / Local de Entrega</label>
                <input
                  type="text"
                  required
                  value={winLoc}
                  onChange={e => setWinLoc(e.target.value)}
                  placeholder="Ex: Praça da Matriz - Barraca 14"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWindowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWindow}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-70 cursor-pointer"
                >
                  {savingWindow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Horário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banner de Aprovação / Pausada */}
      {currentVendor?.active === false && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start sm:items-center gap-3.5 shadow-xs animate-in fade-in">
          <div className="w-10 h-10 rounded-2xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-amber-900">Barraca em Análise / Aguardando Aprovação do Administrador</div>
            <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
              Seu cadastro de barraca foi registrado. Você já pode cadastrar seus produtos, fotos e horários de retirada normalmente. Assim que a administração aprovar, sua barraca ficará visível publicamente na vitrine da feira.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner do Feirante */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold">
                {currentVendor?.businessName || 'Minha Barraca'}
              </h1>
              {currentVendor?.active === false ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40">
                  Aguardando Aprovação
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                  Barraca Ativa na Vitrine
                </span>
              )}
            </div>
            <p className="text-xs text-stone-300 mt-1 max-w-xl line-clamp-2">
              {currentVendor?.description || 'Gestão de pré-pedidos, controle de estoque e catálogo digital.'}
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-amber-200">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {currentVendor?.fairLocation || 'Praça da Feira'}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> {currentVendor?.category}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons for Vendor */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBioModal(true)}
            className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Alterar bio e dados da barraca na vitrine"
          >
            <Edit3 className="w-3.5 h-3.5" /> Editar Bio & Barraca
          </button>

          {currentVendor && (
            <Link
              href={`/feirantes/${currentVendor.slug || currentVendor.id}`}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver na Vitrine
            </Link>
          )}

          <button
            onClick={openNewProductModal}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Adicionar Produto
          </button>
        </div>
      </div>

      {/* Plan Subscription & Usage Card (US18 Freemium) */}
      {(() => {
        const isPro = currentVendor?.plan === 'PRO' || currentVendor?.isSubscriber;
        const activeCount = products.filter(p => p.isActive).length;
        const maxLimit = currentVendor?.maxProducts || 5;
        const usagePercentage = isPro ? 100 : Math.min(100, Math.round((activeCount / maxLimit) * 100));

        return (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Meu Plano Atual:</span>
                {isPro ? (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    <Award className="w-3.5 h-3.5 text-amber-700" />
                    Plano Feirante Pro (Produtos Ilimitados)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
                    Plano Gratuito (Até 5 Produtos)
                  </span>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-stone-700 font-semibold mb-1">
                  <span>Uso do Limite de Produtos:</span>
                  <span className={!isPro && activeCount >= maxLimit ? 'text-red-600 font-bold' : 'text-stone-900 font-extrabold'}>
                    {isPro ? `${activeCount} produtos cadastrados (Ilimitado)` : `${activeCount} de ${maxLimit} produtos (${usagePercentage}%)`}
                  </span>
                </div>

                {!isPro && (
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        activeCount >= maxLimit ? 'bg-red-500' : activeCount >= maxLimit - 1 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                )}
              </div>

              <p className="text-[11px] text-stone-500">
                {isPro
                  ? 'Você é um Feirante Pro! Tem comissão 0% por pedido, produtos ilimitados e selo ⭐ Parceiro Pro de destaque.'
                  : activeCount >= maxLimit
                  ? '⚠️ Você atingiu o limite de 5 produtos do plano gratuito. Faça upgrade para o Plano Pro para liberar o catálogo ilimitado!'
                  : `Faltam ${maxLimit - activeCount} vaga(s) para atingir o limite de produtos do plano gratuito.`}
              </p>
            </div>

            <div className="shrink-0">
              <button
                onClick={handleTogglePlan}
                disabled={togglingPlan}
                className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer ${
                  isPro
                    ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 shadow-amber-500/20'
                }`}
              >
                {togglingPlan ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPro ? (
                  <span>Alternar para Plano Gratuito</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-stone-950" />
                    <span>Assinar Plano Feirante Pro (R$ 49,90/mês)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Featured / Sponsored Spotlight Card (US19) */}
      {(() => {
        const isFeatured = Boolean(currentVendor?.isFeatured);
        const featuredUntil = currentVendor?.featuredUntil;
        const isExpired = featuredUntil && new Date(featuredUntil).getTime() < Date.now();
        const activeFeatured = isFeatured && !isExpired;

        return (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-white rounded-3xl p-6 border border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
                  Destaque Patrocinado na Vitrine:
                </span>
                {activeFeatured ? (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-xs">
                    ⭐ Barraca Patrocinada Ativa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
                    Não contratado
                  </span>
                )}
              </div>

              <h4 className="font-extrabold text-stone-900 text-sm sm:text-base">
                {activeFeatured
                  ? 'Sua barraca está em primeiro lugar na página inicial!'
                  : 'Multiplique seus pedidos aparecendo no topo da feira'}
              </h4>

              <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                {activeFeatured
                  ? `Sua barraca está em exibição prioritária no topo da vitrine pública com selo "Patrocinado"${
                      featuredUntil ? ` até ${new Date(featuredUntil).toLocaleDateString('pt-BR')}` : ''
                    }. Aproveite o fluxo extra de pré-pedidos!`
                  : 'Contrate o Destaque Patrocinado para posicionar sua barraca no carrossel de topo da vitrine principal com selo exclusivo de destaque por 7 dias (R$ 29,90 simulado).'}
              </p>

              {featuredSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{featuredSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                onClick={handleToggleFeatured}
                disabled={togglingFeatured}
                className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer ${
                  activeFeatured
                    ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300'
                    : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-stone-950 font-black shadow-amber-500/25'
                }`}
              >
                {togglingFeatured ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : activeFeatured ? (
                  <span>Pausar Destaque Patrocinado</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-stone-950 fill-stone-950" />
                    <span>Contratar Destaque (R$ 29,90/semana)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-400 block">Pré-pedidos em Aberto</span>
            <span className="text-2xl font-black text-stone-900 mt-1 block">{activeOrdersCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-400 block">Volume Total (Vendas)</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{formatCurrency(totalVolume)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-400 block">Produtos no Catálogo</span>
            <span className="text-2xl font-black text-stone-900 mt-1 block">{products.filter(p => p.isActive).length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-400 block">Avaliação Média</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">★ {currentVendor?.rating || '5.0'}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap border-b border-stone-200 gap-2 sm:gap-6">
        <button
          onClick={() => setActiveTab('KANBAN')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'KANBAN'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Kanban de Pedidos
          <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-[10px] text-stone-600 font-extrabold">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'AUDIT'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Auditoria & Histórico
          <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-[10px] text-stone-600 font-extrabold">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'PRODUCTS'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Estoque & Produtos
          <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-[10px] text-stone-600 font-extrabold">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('WINDOWS')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'WINDOWS'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Horários de Retirada
          <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-[10px] text-stone-600 font-extrabold">
            {pickupWindows.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('REVIEWS')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'REVIEWS'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Avaliações dos Clientes
          <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-[10px] text-stone-600 font-extrabold">
            {reviews.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('FINANCIAL')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'FINANCIAL'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Financeiro & Fechamento
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-[10px] text-emerald-800 font-extrabold">
            {financeData?.totalOrdersCount ?? 0}
          </span>
        </button>
      </div>

      {/* Tab 1: KANBAN */}
      {activeTab === 'KANBAN' && (
        <OrderKanban
          orders={orders}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      )}

      {/* Tab 2: AUDIT & HISTORY */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-stone-900 text-lg">Auditoria & Histórico de Pedidos da Barraca</h3>
              <p className="text-xs text-stone-500">Consulte todos os pré-pedidos recebidos com busca rápida e detalhes completos</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  placeholder="Buscar código #FL, cliente ou telefone..."
                  className="pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none font-semibold text-stone-700"
              >
                <option value="ALL">Todos os Status</option>
                <option value="NOVO">Novos</option>
                <option value="EM_PREPARO">Em Preparo</option>
                <option value="PRONTO">Prontos</option>
                <option value="RETIRADO">Retirados / Concluídos</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Código / Data</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Itens do Pré-pedido</th>
                  <th className="p-3.5">Data de Retirada</th>
                  <th className="p-3.5">Valor Total</th>
                  <th className="p-3.5">Pagamento</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-stone-50/60 transition">
                      <td className="p-3.5 font-mono font-bold text-stone-900">
                        #{order.orderNumber}
                        <div className="text-[10px] text-stone-400 font-sans font-normal mt-0.5">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-stone-800">{order.clientName}</div>
                        {order.clientPhone && (
                          <div className="text-[10px] text-stone-400">{order.clientPhone}</div>
                        )}
                      </td>

                      <td className="p-3.5 text-stone-600 text-[11px] max-w-[220px] truncate">
                        {order.items?.map((i: any) => `${i.quantity}x ${i.productName}`).join(', ') || 'Itens'}
                      </td>

                      <td className="p-3.5 text-stone-600 text-[11px]">
                        {order.pickupDate}
                      </td>

                      <td className="p-3.5 font-extrabold text-stone-900">
                        {formatCurrency(order.totalAmount)}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.paymentStatus === 'SIMULADO_APROVADO'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.paymentStatus === 'SIMULADO_APROVADO' ? 'Mercado Pago' : 'Na Retirada'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          order.status === 'PRONTO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'EM_PREPARO'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'RETIRADO'
                            ? 'bg-stone-100 text-stone-700'
                            : order.status === 'CANCELADO'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: PRODUCTS */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Catálogo de Produtos Cadastrados</h2>
            <button
              onClick={openNewProductModal}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Produto
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Produto</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Preço Unitário</th>
                  <th className="p-3.5">Estoque</th>
                  <th className="p-3.5">Selo Orgânico</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map(p => (
                  <tr key={p.id} className={`hover:bg-stone-50/60 ${!p.isActive ? 'opacity-40' : ''}`}>
                    <td className="p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <Store className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900">{p.name}</div>
                        <div className="text-[10px] text-stone-400 line-clamp-1">{p.description}</div>
                      </div>
                    </td>
                    <td className="p-3.5 text-stone-600 font-medium">{p.category}</td>
                    <td className="p-3.5 font-bold text-stone-900">
                      {formatCurrency(p.price)} <span className="text-stone-400 font-normal">/{p.unit}</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        p.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : p.stock <= 5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.stock} {p.unit}s
                      </span>
                    </td>
                    <td className="p-3.5">
                      {p.isOrganic ? (
                        <span className="text-emerald-700 font-bold text-[11px]">✓ Sim</span>
                      ) : (
                        <span className="text-stone-400 text-[11px]">Não</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => openEditProductModal(p)}
                        className="p-1.5 text-stone-500 hover:text-amber-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Desativar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: PICKUP WINDOWS */}
      {activeTab === 'WINDOWS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Dias e Horários de Retirada na Feira</h2>
              <p className="text-xs text-stone-500">Configure as janelas em que seus clientes podem retirar os pedidos na sua barraca</p>
            </div>
            <button
              onClick={() => setShowWindowModal(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Janela de Horário
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pickupWindows.map(win => (
              <div key={win.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs">
                      {win.dayOfWeek}
                    </span>
                    <button
                      onClick={() => handleDeleteWindow(win.id)}
                      className="p-1 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                      title="Excluir janela"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    {win.startTime} às {win.endTime}
                  </div>

                  <div className="text-xs text-stone-500 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <span>{win.location}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 font-medium">
                  <span>Capacidade máxima:</span>
                  <span className="font-bold text-stone-700">{win.maxOrders} pré-pedidos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: REVIEWS */}
      {activeTab === 'REVIEWS' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Avaliações e Comentários dos Clientes</h2>
            <p className="text-xs text-stone-500">Feedback deixado por consumidores que retiraram produtos na sua barraca</p>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-stone-400 space-y-2">
              <Star className="w-10 h-10 stroke-1 mx-auto text-amber-400" />
              <p className="font-semibold text-stone-700 text-sm">Nenhuma avaliação recebida ainda</p>
              <p className="text-xs max-w-sm mx-auto">Conforme os clientes retirarem seus pedidos, as notas e comentários aparecerão aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map(rev => (
                <div key={rev.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-stone-900 text-sm">{rev.clientName}</div>
                    <span className="text-[10px] text-stone-400">{formatDate(rev.createdAt)}</span>
                  </div>

                  <div>
                    <StarRating rating={rev.rating} size="sm" />
                  </div>

                  {rev.comment && (
                    <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100 italic leading-relaxed">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: FINANCIAL & CLOSING (US20) */}
      {activeTab === 'FINANCIAL' && (
        <div id="printable-financial-statement" className="space-y-6 animate-in fade-in">
          {/* Global Print Styles */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-financial-statement, #printable-financial-statement * {
                visibility: visible;
              }
              #printable-financial-statement {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: #1c1917 !important;
                padding: 16px;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          {/* Printable Header (Visible when printing) */}
          <div className="hidden print:block border-b-2 border-stone-800 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-stone-900 tracking-tight">Feirae • Fechamento de Caixa</h1>
                <p className="text-xs text-stone-600 mt-0.5">Comprovante e Extrato Financeiro Consolidado da Barraca</p>
              </div>
              <div className="text-right text-xs text-stone-500">
                <div>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="font-bold text-stone-800">Feira: {financeDateFilter === 'ALL' ? 'Todas as Feiras (Consolidado)' : financeDateFilter}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-stone-700 flex flex-wrap gap-4 pt-2 border-t border-stone-200">
              <span><strong>Barraca / Feirante:</strong> {financeData?.vendor.businessName || currentVendor?.businessName}</span>
              <span><strong>Plano Atual:</strong> {financeData?.vendor.isPro ? 'Feirante Pro (0% de comissão)' : 'Gratuito (5% taxa retida)'}</span>
              <span><strong>Pedidos Concluídos:</strong> {financeData?.totalOrdersCount ?? 0}</span>
            </div>
          </div>

          {/* Interactive Header & Action Toolbar (Screen View) */}
          <div className="no-print bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-extrabold text-stone-900">Fechamento de Caixa & Extrato Financeiro</h2>
                {financeData?.vendor.isPro ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                    <Award className="w-3 h-3 text-amber-700" /> 0% Comissão Pro
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                    5% Taxa Retida (Plano Grátis)
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Acompanhe o fechamento consolidado por dia de feira, discriminação de taxas e modalidades de recebimento.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Date Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs">
                <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span className="font-semibold text-stone-500 text-[11px] hidden sm:inline">Filtrar Feira:</span>
                <select
                  value={financeDateFilter}
                  onChange={e => setFinanceDateFilter(e.target.value)}
                  className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todas as Feiras (Consolidado)</option>
                  {financeData?.availableDates?.map(d => (
                    <option key={d} value={d}>
                      Feira de {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition flex items-center gap-1.5 border border-stone-200 shadow-2xs cursor-pointer"
                title="Exportar extrato em planilha CSV compatível com Excel e Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Exportar CSV</span>
              </button>

              {/* Print / PDF Button */}
              <button
                onClick={handlePrintStatement}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition flex items-center gap-1.5 border border-stone-200 shadow-2xs cursor-pointer"
                title="Imprimir extrato ou salvar em PDF"
              >
                <Printer className="w-4 h-4 text-stone-700" />
                <span>Imprimir / PDF</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={() => fetchFinanceStats(financeDateFilter)}
                disabled={loadingFinance}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 cursor-pointer transition"
                title="Atualizar dados financeiros"
              >
                <RefreshCw className={`w-4 h-4 ${loadingFinance ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Consolidated Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Bruto (GMV) */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Bruto (GMV)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-stone-900 block">
                  {formatCurrency(financeData?.totalGross ?? 0)}
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5">
                  {financeData?.totalOrdersCount ?? 0} pedidos concluídos
                </span>
              </div>
            </div>

            {/* Card 2: Comissão Retida */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Taxa da Plataforma</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  financeData?.vendor.isPro ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                }`}>
                  <Tag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-2xl font-black block ${
                  financeData?.vendor.isPro ? 'text-amber-700' : 'text-red-600'
                }`}>
                  {formatCurrency(financeData?.totalCommission ?? 0)}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  {financeData?.vendor.isPro ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200">
                      0% Isento (Plano Pro)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-800 bg-red-50 px-1.5 py-0.2 rounded-md border border-red-200">
                      5% Retido (Plano Grátis)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Valor Líquido a Receber */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 p-5 rounded-2xl border-2 border-emerald-300 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Saldo Líquido</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-emerald-800 block">
                  {formatCurrency(financeData?.totalNet ?? 0)}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 block mt-0.5">
                  Valor líquido do feirante
                </span>
              </div>
            </div>

            {/* Card 4: Modalidades: No Ato vs App */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Modalidades de Recebimento</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">No Ato (Barraca):</span>
                  <span className="font-bold text-stone-800">{formatCurrency(financeData?.paidAtPickup ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">Via App (Online):</span>
                  <span className="font-bold text-teal-700">{formatCurrency(financeData?.paidOnline ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Card 5: Ticket Médio */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Ticket Médio</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-stone-900 block">
                  {formatCurrency(financeData?.averageTicket ?? 0)}
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5">
                  Média por pedido concluído
                </span>
              </div>
            </div>
          </div>

          {/* Visual Chart: Evolução das Últimas 4 Feiras */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  Evolução do Faturamento das Últimas 4 Feiras
                </h3>
                <p className="text-xs text-stone-500">
                  Comparativo de desempenho entre as feiras recentes com volume bruto e líquido
                </p>
              </div>

              {(() => {
                const total4Fairs = (financeData?.recentFairs || []).reduce((sum, f) => sum + f.totalGross, 0);
                const avg4Fairs = (financeData?.recentFairs || []).length > 0
                  ? total4Fairs / financeData!.recentFairs.length
                  : 0;
                return (
                  <div className="flex items-center gap-3 text-xs bg-stone-50 px-3.5 py-1.5 rounded-xl border border-stone-200">
                    <span>Total 4 Feiras: <strong className="text-stone-900">{formatCurrency(total4Fairs)}</strong></span>
                    <span className="text-stone-300">|</span>
                    <span>Média por Feira: <strong className="text-emerald-700">{formatCurrency(avg4Fairs)}</strong></span>
                  </div>
                );
              })()}
            </div>

            {/* Bars Container */}
            {(() => {
              const fairs = financeData?.recentFairs || [];
              const maxGross = Math.max(...fairs.map(f => f.totalGross), 50);

              if (fairs.length === 0) {
                return (
                  <div className="py-8 text-center text-xs text-stone-400">
                    Ainda não há dados suficientes das feiras passadas para exibir o gráfico.
                  </div>
                );
              }

              return (
                <div className="pt-6 pb-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end min-h-[190px]">
                    {fairs.map((fair, idx) => {
                      const heightPercent = maxGross > 0 ? Math.max(14, Math.round((fair.totalGross / maxGross) * 100)) : 14;
                      const isSelected = financeDateFilter === fair.date;

                      return (
                        <div
                          key={fair.date || idx}
                          onClick={() => setFinanceDateFilter(fair.date)}
                          className={`flex flex-col items-center justify-end p-3 rounded-2xl transition cursor-pointer group ${
                            isSelected 
                              ? 'bg-amber-50/80 border-2 border-amber-400 shadow-xs' 
                              : 'bg-stone-50/70 hover:bg-stone-100 border border-stone-200'
                          }`}
                          title={`Clique para filtrar os lançamentos da feira de ${fair.date}`}
                        >
                          {/* Value on top of bar */}
                          <span className={`text-xs font-black mb-2 transition ${
                            isSelected ? 'text-amber-900 scale-105' : 'text-stone-700 group-hover:text-stone-900'
                          }`}>
                            {formatCurrency(fair.totalGross)}
                          </span>

                          {/* Graphical Bar */}
                          <div className="w-full h-32 flex items-end justify-center">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={`w-14 sm:w-16 rounded-xl transition-all duration-300 flex flex-col justify-end p-1.5 shadow-xs ${
                                isSelected
                                  ? 'bg-gradient-to-t from-amber-600 to-amber-500 ring-2 ring-amber-400/50'
                                  : 'bg-gradient-to-t from-emerald-600 to-teal-500 group-hover:from-emerald-700 group-hover:to-teal-600'
                              }`}
                            >
                              <div className="w-full bg-white/20 rounded-md py-0.5 text-center text-[9px] font-black text-white">
                                {fair.orderCount} ped.
                              </div>
                            </div>
                          </div>

                          {/* Label below bar */}
                          <div className="mt-3 text-center space-y-0.5">
                            <span className={`text-xs font-bold block ${isSelected ? 'text-amber-900' : 'text-stone-800'}`}>
                              {fair.date}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              Líq: {formatCurrency(fair.totalNet)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-stone-400 text-center mt-3">
                    💡 Dica: Clique em uma das barras para filtrar rapidamente os lançamentos daquela feira específica na tabela abaixo.
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Statement Table of Orders (Extrato Detalhado de Lançamentos) */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">Extrato Detalhado de Lançamentos</h3>
                <p className="text-xs text-stone-500">
                  {financeDateFilter === 'ALL'
                    ? 'Exibindo todos os lançamentos de pedidos concluídos'
                    : `Filtrando apenas a Feira de ${financeDateFilter}`}
                </p>
              </div>

              <div className="text-xs font-bold text-stone-600 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shrink-0">
                Total de lançamentos: <span className="text-emerald-700 font-extrabold">{financeData?.orders?.length ?? 0}</span>
              </div>
            </div>

            {/* Table or Empty State */}
            {(!financeData?.orders || financeData.orders.length === 0) ? (
              <div className="p-12 text-center text-stone-400 space-y-2">
                <Banknote className="w-10 h-10 stroke-1 mx-auto text-stone-300" />
                <p className="font-semibold text-stone-700 text-sm">Nenhum lançamento financeiro encontrado</p>
                <p className="text-xs max-w-sm mx-auto text-stone-500">
                  Quando pedidos forem marcados com o status "RETIRADO" para este dia de feira, seus valores brutos, taxas e saldo líquido aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100/70 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Pedido #</th>
                      <th className="px-5 py-3.5">Data da Feira</th>
                      <th className="px-5 py-3.5">Cliente</th>
                      <th className="px-5 py-3.5">Forma de Pagamento</th>
                      <th className="px-5 py-3.5 text-right">Valor Bruto</th>
                      <th className="px-5 py-3.5 text-right">
                        Taxa Retida ({financeData?.vendor.isPro ? '0% Pro' : '5%'})
                      </th>
                      <th className="px-5 py-3.5 text-right">Valor Líquido</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {financeData.orders.map(order => {
                      const isAtPickup = order.paymentMethod === 'RETIRADA';
                      const isPixApp = order.paymentMethod === 'MERCADO_PAGO_PIX';

                      return (
                        <tr key={order.id} className="hover:bg-amber-50/30 transition">
                          {/* Order Number */}
                          <td className="px-5 py-3.5 font-bold font-mono text-stone-900">
                            {order.orderNumber}
                          </td>

                          {/* Pickup Date */}
                          <td className="px-5 py-3.5 text-stone-600">
                            <div className="font-semibold text-stone-800">{order.pickupDate || '-'}</div>
                            <div className="text-[10px] text-stone-400">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR')} {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Client */}
                          <td className="px-5 py-3.5 text-stone-800">
                            <div className="font-bold text-stone-900">{order.clientName}</div>
                            {order.clientPhone && (
                              <div className="text-[10px] text-stone-400">{order.clientPhone}</div>
                            )}
                          </td>

                          {/* Payment Method Badge */}
                          <td className="px-5 py-3.5">
                            {isAtPickup ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                <Banknote className="w-3 h-3 text-amber-700" />
                                No Ato (Na Barraca)
                              </span>
                            ) : isPixApp ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-900 border border-teal-200">
                                <CreditCard className="w-3 h-3 text-teal-700" />
                                App (Pix Mercado Pago)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                                <CreditCard className="w-3 h-3 text-blue-700" />
                                App (Cartão de Crédito)
                              </span>
                            )}
                          </td>

                          {/* Total Gross */}
                          <td className="px-5 py-3.5 text-right font-bold text-stone-900">
                            {formatCurrency(order.totalAmount)}
                          </td>

                          {/* Commission */}
                          <td className={`px-5 py-3.5 text-right font-semibold ${
                            order.commission === 0 ? 'text-amber-700 font-bold' : 'text-red-600'
                          }`}>
                            {order.commission === 0 ? 'R$ 0,00' : `- ${formatCurrency(order.commission)}`}
                          </td>

                          {/* Net Amount */}
                          <td className="px-5 py-3.5 text-right font-black text-emerald-700">
                            {formatCurrency(order.net)}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              RETIRADO
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totalizer Footer */}
                  <tfoot className="bg-stone-100 text-stone-900 font-extrabold border-t-2 border-stone-200 text-xs">
                    <tr>
                      <td colSpan={4} className="px-5 py-4 text-right uppercase tracking-wider text-[11px] text-stone-600">
                        Total Consolidado do Período ({financeData.orders.length} pedidos):
                      </td>
                      <td className="px-5 py-4 text-right text-stone-900 font-black">
                        {formatCurrency(financeData.totalGross)}
                      </td>
                      <td className={`px-5 py-4 text-right ${financeData.totalCommission === 0 ? 'text-amber-700 font-bold' : 'text-red-600'}`}>
                        {financeData.totalCommission === 0 ? 'R$ 0,00' : `- ${formatCurrency(financeData.totalCommission)}`}
                      </td>
                      <td className="px-5 py-4 text-right text-emerald-800 font-black text-sm">
                        {formatCurrency(financeData.totalNet)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
