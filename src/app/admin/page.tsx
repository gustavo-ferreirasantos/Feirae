'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Store, 
  ShoppingBag, 
  TrendingUp, 
  Layers,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Search,
  Clock,
  AlertCircle,
  Sparkles,
  Calendar,
  Users,
  Repeat,
  Zap,
  Eye,
  ShoppingCart,
  BarChart3,
  ArrowDown,
  ArrowRight,
  Flame,
  Award,
  Filter,
  Check,
  HelpCircle,
  Sliders,
  Calculator,
  Target,
  Coins,
  DollarSign,
  PieChart,
  RefreshCcw,
  Scale,
  Compass,
  Leaf,
  FileText
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useUser } from '@/lib/user-context';
import { LoginModal } from '@/components/LoginModal';
import { PeriodFilter } from '@/types';

export default function AdminDashboardPage() {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AARRR' | 'SIMULATOR' | 'VENDORS' | 'PRODUCTS' | 'CERT_MODERATION'>('OVERVIEW');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [stats, setStats] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  // Simulator State (US26)
  const [simulatedGMV, setSimulatedGMV] = useState<number>(30000);
  const [simulatedCommissionRate, setSimulatedCommissionRate] = useState<number>(0);
  const [simulatedProCount, setSimulatedProCount] = useState<number>(15);
  const proMonthlyPrice = 49.90;

  // Filters
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorStatusFilter, setVendorStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [productSearch, setProductSearch] = useState('');

  // Organic Certification Moderation State (US27)
  const [certSearch, setCertSearch] = useState('');
  const [certStatusFilter, setCertStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [rejectingVendorId, setRejectingVendorId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [previewingDocUrl, setPreviewingDocUrl] = useState<string | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const loadAdminData = async (targetPeriod = period) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      setLoadingStats(true);
      const [statsRes, vendRes, prodRes] = await Promise.all([
        fetch(`/api/admin/stats?period=${targetPeriod}`),
        fetch('/api/vendors?includeAll=true'),
        fetch('/api/products?includeInactive=true'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (vendRes.ok) setVendors(await vendRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStats(false);
    }
  };

  const handlePeriodChange = async (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${newPeriod}`);
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isAdmin]);

  const handleToggleVendor = async (vendorId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      });
      if (res.ok) {
        setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, active: nextActive } : v));
        setActionFeedback(`Barraca ${nextActive ? 'aprovada / ativada na vitrine' : 'pausada da vitrine'} com sucesso.`);
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFeaturedVendor = async (vendorId: string, currentFeatured: boolean) => {
    const nextFeatured = !currentFeatured;
    const featuredUntil = nextFeatured ? new Date(Date.now() + 86400000 * 7).toISOString() : null;
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: nextFeatured, featuredUntil }),
      });
      if (res.ok) {
        setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, isFeatured: nextFeatured, featuredUntil } : v));
        setActionFeedback(`Destaque patrocinado da barraca ${nextFeatured ? 'ativado' : 'pausado'} com sucesso.`);
        setTimeout(() => setActionFeedback(null), 3000);
        // Reload stats
        const statsRes = await fetch(`/api/admin/stats?period=${period}`);
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProduct = async (productId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, isActive: nextActive } : p));
        setActionFeedback(`Produto ${nextActive ? 'reativado' : 'ocultado'} com sucesso.`);
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveCert = async (vendorId: string) => {
    try {
      const now = new Date().toISOString();
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCertifiedOrganic: true,
          certStatus: 'APPROVED',
          certReviewedAt: now,
          certRejectionReason: null,
        }),
      });
      if (res.ok) {
        setVendors(prev => prev.map(v => v.id === vendorId ? {
          ...v,
          isCertifiedOrganic: true,
          certStatus: 'APPROVED',
          certReviewedAt: now,
          certRejectionReason: null,
        } : v));
        setActionFeedback(`Selo 'Orgânico Certificado' aprovado e homologado com sucesso!`);
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectCert = async (vendorId: string, reason: string) => {
    try {
      const now = new Date().toISOString();
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCertifiedOrganic: false,
          certStatus: 'REJECTED',
          certReviewedAt: now,
          certRejectionReason: reason || 'Documento ilegível, vencido ou com divergência cadastral.',
        }),
      });
      if (res.ok) {
        setVendors(prev => prev.map(v => v.id === vendorId ? {
          ...v,
          isCertifiedOrganic: false,
          certStatus: 'REJECTED',
          certReviewedAt: now,
          certRejectionReason: reason || 'Documento ilegível, vencido ou com divergência cadastral.',
        } : v));
        setRejectingVendorId(null);
        setRejectionReasonInput('');
        setActionFeedback(`Solicitação de certificação orgânica rejeitada com justificativa enviada.`);
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeCert = async (vendorId: string) => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCertifiedOrganic: false,
          certStatus: 'NONE',
          certReviewedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setVendors(prev => prev.map(v => v.id === vendorId ? {
          ...v,
          isCertifiedOrganic: false,
          certStatus: 'NONE',
        } : v));
        setActionFeedback(`Selo de certificação orgânica revogado.`);
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-3xl border border-purple-200/80 shadow-md space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Acesso Restrito ao Administrador</h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            Você está conectado como <strong>{currentUser?.name || 'Visitante'}</strong>. O painel de administração é restrito à conta da gestão da feira.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              Fazer Login como Administrador
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

  if (loading || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-stone-400 animate-pulse">
        Carregando dados da administração...
      </div>
    );
  }

  const pendingVendorsCount = vendors.filter(v => v.active === false).length;
  const pendingCertsCount = vendors.filter(v => v.certStatus === 'PENDING').length;
  const approvedCertsCount = vendors.filter(v => v.certStatus === 'APPROVED' && v.isCertifiedOrganic).length;
  const rejectedCertsCount = vendors.filter(v => v.certStatus === 'REJECTED').length;

  const filteredCerts = vendors.filter(v => {
    const hasCertActivity = Boolean(v.certStatus && v.certStatus !== 'NONE');
    if (certStatusFilter === 'ALL' && !hasCertActivity && !certSearch) return false;

    const query = certSearch.toLowerCase();
    const matchesSearch = !certSearch ||
      v.businessName?.toLowerCase().includes(query) ||
      v.certRegistrationNumber?.toLowerCase().includes(query) ||
      v.certIssuingBody?.toLowerCase().includes(query) ||
      v.user?.name?.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (certStatusFilter === 'PENDING') return v.certStatus === 'PENDING';
    if (certStatusFilter === 'APPROVED') return v.certStatus === 'APPROVED';
    if (certStatusFilter === 'REJECTED') return v.certStatus === 'REJECTED';
    return true;
  });

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = 
      v.businessName?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.category?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.user?.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.user?.email?.toLowerCase().includes(vendorSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (vendorStatusFilter === 'PENDING') return v.active === false;
    if (vendorStatusFilter === 'ACTIVE') return v.active === true;
    if (vendorStatusFilter === 'PAUSED') return v.active === false;
    return true;
  });

  const filteredProducts = products.filter(p => {
    return (
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.vendorName?.toLowerCase().includes(productSearch.toLowerCase())
    );
  });

  const renderProductAnalytics = () => {
    const pa = stats?.productAnalytics;
    if (!pa) return null;

    const periodLabel = 
      period === '7d' ? 'Últimos 7 dias' : 
      period === '30d' ? 'Últimos 30 dias' : 
      'Todo o Histórico (Geral)';

    // Step calculations for the funnel bars
    const maxFunnelVal = Math.max(pa.funnel.showcaseViews, 1);
    const viewsPercent = 100;
    const cartPercent = Math.max(16, Math.min(100, Math.round((pa.funnel.cartAdditions / maxFunnelVal) * 100 * 3.5)));
    const ordersPercent = Math.max(12, Math.min(100, Math.round((pa.funnel.ordersCreated / maxFunnelVal) * 100 * 5.5)));
    const completedPercent = Math.max(8, Math.min(100, Math.round((pa.funnel.ordersCompleted / maxFunnelVal) * 100 * 6.5)));

    return (
      <div className="space-y-6">
        {/* Section Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold backdrop-blur-xs">
                <BarChart3 className="w-3.5 h-3.5 text-purple-300" />
                Product Analytics
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{periodLabel}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Métricas de Produto (Framework AARRR)
              </h2>
              <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl leading-relaxed">
                Acompanhe a saúde e o engajamento do marketplace da feira livre: atração de clientes, ativação de feirantes com catálogo diversificado, retenção semanal de compradores e conversão do funil de compras.
              </p>
            </div>

            {loadingStats && (
              <div className="flex items-center gap-2 bg-white/15 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-purple-100">
                <div className="w-3.5 h-3.5 border-2 border-purple-200 border-t-transparent rounded-full animate-spin" />
                <span>Atualizando dados...</span>
              </div>
            )}
          </div>
        </div>

        {/* 1. 5 Cards Framework AARRR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Acquisition */}
          <div className="bg-white p-4.5 rounded-3xl border border-stone-200 shadow-xs hover:border-indigo-200 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                A • Aquisição
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-stone-900 block tracking-tight">
                {pa.funnel.showcaseViews.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-stone-700 mt-0.5 block">Visualizações de Vitrine</span>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {pa.funnel.cartAdditions} adicionaram itens ({pa.funnel.viewsToCartRate}% interesse)
              </p>
            </div>
          </div>

          {/* Activation */}
          <div className="bg-white p-4.5 rounded-3xl border border-stone-200 shadow-xs hover:border-emerald-200 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                A • Ativação
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-700 block tracking-tight">
                {pa.activation.activationRate}%
              </span>
              <span className="text-xs font-bold text-stone-700 mt-0.5 block">Ativação de Feirantes</span>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {pa.activation.activatedVendors} de {pa.activation.totalVendors} feirantes têm ≥ 3 produtos
              </p>
            </div>
          </div>

          {/* Retention */}
          <div className="bg-white p-4.5 rounded-3xl border border-stone-200 shadow-xs hover:border-purple-200 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">
                R • Retenção
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Repeat className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-purple-700 block tracking-tight">
                {pa.retention.consecutiveRetentionRate}%
              </span>
              <span className="text-xs font-bold text-stone-700 mt-0.5 block">Recorrência Semanal</span>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {pa.retention.consecutiveWeeksCustomersCount} clientes compraram em semanas seguidas
              </p>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white p-4.5 rounded-3xl border border-stone-200 shadow-xs hover:border-amber-200 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md">
                R • Receita
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-stone-900 block tracking-tight">
                {formatCurrency(stats.totalGMV)}
              </span>
              <span className="text-xs font-bold text-stone-700 mt-0.5 block">Volume Movimentado</span>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {stats.totalOrders} pedido(s) transacionados
              </p>
            </div>
          </div>

          {/* Referral / Recompra */}
          <div className="bg-white p-4.5 rounded-3xl border border-stone-200 shadow-xs hover:border-rose-200 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider uppercase text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md">
                R • Recompra
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-rose-700 block tracking-tight">
                {pa.retention.retentionRate}%
              </span>
              <span className="text-xs font-bold text-stone-700 mt-0.5 block">Taxa de Recompra</span>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {pa.retention.repeatCustomersCount} clientes fiéis com pedidos recorrentes
              </p>
            </div>
          </div>
        </div>

        {/* 2. Visual Conversion Funnel (4 Steps) */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 mb-1">
                <Filter className="w-3.5 h-3.5" />
                Funil de Conversão de Compras (4 Etapas)
              </div>
              <h3 className="font-black text-stone-900 text-lg">
                Conversão do Fluxo de Compra da Feira Livre
              </h3>
              <p className="text-xs text-stone-500">
                Visualizações de Vitrine → Adições ao Carrinho → Pedidos Gerados → Pedidos Retirados na Banca
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                Taxa Geral: {pa.funnel.overallConversionRate}%
              </div>
              <div className="px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold">
                Retirada: {pa.funnel.orderToCompletedRate}%
              </div>
            </div>
          </div>

          {/* Funnel Visual Steps */}
          <div className="space-y-3 pt-2">
            {/* Step 1: Vitrine */}
            <div className="relative group">
              <div className="bg-stone-50 hover:bg-stone-100/80 rounded-2xl p-4 border border-stone-200 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">1</span>
                    <span className="text-xs font-bold text-stone-900">Visualizações de Vitrine</span>
                    <span className="text-[11px] text-stone-400 hidden sm:inline">(Visitantes navegando nas bancas da feira)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-stone-900">{pa.funnel.showcaseViews.toLocaleString('pt-BR')}</span>
                    <span className="text-[11px] text-stone-400 font-semibold ml-1.5 block sm:inline">100% (Topo do Funil)</span>
                  </div>
                </div>
                <div className="w-full bg-stone-200/70 h-3 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${viewsPercent}%` }} />
                </div>
              </div>

              {/* Transition Badge 1 -> 2 */}
              <div className="flex items-center justify-center my-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-black shadow-2xs">
                  <ArrowDown className="w-3 h-3 text-indigo-600" />
                  <span>{pa.funnel.viewsToCartRate}% de taxa de interesse (adicionaram produtos)</span>
                </div>
              </div>
            </div>

            {/* Step 2: Carrinho */}
            <div className="relative group">
              <div className="bg-stone-50 hover:bg-stone-100/80 rounded-2xl p-4 border border-stone-200 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-white text-xs font-black flex items-center justify-center">2</span>
                    <span className="text-xs font-bold text-stone-900">Adições ao Carrinho</span>
                    <span className="text-[11px] text-stone-400 hidden sm:inline">(Clientes montando sua sacola)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-stone-900">{pa.funnel.cartAdditions}</span>
                    <span className="text-[11px] text-amber-700 font-semibold ml-1.5 block sm:inline">{pa.funnel.viewsToCartRate}% do topo</span>
                  </div>
                </div>
                <div className="w-full bg-stone-200/70 h-3 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${cartPercent}%` }} />
                </div>
              </div>

              {/* Transition Badge 2 -> 3 */}
              <div className="flex items-center justify-center my-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black shadow-2xs">
                  <ArrowDown className="w-3 h-3 text-amber-600" />
                  <span>{pa.funnel.cartToOrderRate}% concluíram reserva de pedido</span>
                </div>
              </div>
            </div>

            {/* Step 3: Pedidos Gerados */}
            <div className="relative group">
              <div className="bg-stone-50 hover:bg-stone-100/80 rounded-2xl p-4 border border-stone-200 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">3</span>
                    <span className="text-xs font-bold text-stone-900">Pedidos Gerados</span>
                    <span className="text-[11px] text-stone-400 hidden sm:inline">(Reservas para retirada confirmadas)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-stone-900">{pa.funnel.ordersCreated}</span>
                    <span className="text-[11px] text-blue-700 font-semibold ml-1.5 block sm:inline">{pa.funnel.cartToOrderRate}% dos carrinhos</span>
                  </div>
                </div>
                <div className="w-full bg-stone-200/70 h-3 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${ordersPercent}%` }} />
                </div>
              </div>

              {/* Transition Badge 3 -> 4 */}
              <div className="flex items-center justify-center my-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-black shadow-2xs">
                  <ArrowDown className="w-3 h-3 text-emerald-600" />
                  <span>{pa.funnel.orderToCompletedRate}% dos pedidos retirados na feira</span>
                </div>
              </div>
            </div>

            {/* Step 4: Pedidos Retirados */}
            <div className="relative group">
              <div className="bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl p-4 border border-emerald-200 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">4</span>
                    <span className="text-xs font-bold text-emerald-950">Pedidos Retirados na Banca</span>
                    <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline">(Conversão final completa)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-emerald-800">{pa.funnel.ordersCompleted}</span>
                    <span className="text-[11px] text-emerald-700 font-bold ml-1.5 block sm:inline">
                      {pa.funnel.overallConversionRate}% de conversão global
                    </span>
                  </div>
                </div>
                <div className="w-full bg-emerald-200/60 h-3 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${completedPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Efficiency Summary Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-extrabold text-indigo-950 block">Conversão Global: {pa.funnel.overallConversionRate}%</span>
                <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                  Para cada 1.000 visualizações na vitrine virtual, cerca de {Math.round(pa.funnel.overallConversionRate * 10)} pedidos são retirados com sucesso diretamente na banca do produtor.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-extrabold text-emerald-950">Taxa de Conclusão: {pa.funnel.orderToCompletedRate}%</span>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                  Dos pedidos agendados, {pa.funnel.orderToCompletedRate}% são efetivamente retirados, indicando altíssimo comparecimento dos feirantes e redução de sobras.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Activation & Retention Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* VENDOR ACTIVATION METRIC */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mb-1">
                  Engajamento de Oferta
                </span>
                <h3 className="font-extrabold text-stone-900 text-base">
                  Ativação de Feirantes (≥ 3 Produtos)
                </h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-700 block">{pa.activation.activationRate}%</span>
                <span className="text-[10px] font-bold text-stone-400 block uppercase">Taxa de Ativação</span>
              </div>
            </div>

            {/* Visual Activation Progress Gauge */}
            <div className="space-y-2 p-4 rounded-2xl bg-stone-50 border border-stone-100">
              <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                <span>Progresso da Base de Barracas</span>
                <span>{pa.activation.activatedVendors} de {pa.activation.totalVendors} ativados</span>
              </div>
              <div className="w-full bg-stone-200 h-3.5 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${pa.activation.activationRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                <span>Critério: Feirante ter publicado ≥ 3 produtos ativos</span>
                <span className="font-bold text-emerald-700">
                  {pa.activation.activationRate >= 70 ? 'Meta de Catálogo Atingida (≥ 70%)' : 'Necessário incentivar cadastro'}
                </span>
              </div>
            </div>

            {/* Vendors Breakdown Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800 block">Status de Ativação por Barraca:</span>
              <div className="divide-y divide-stone-100 border border-stone-200/80 rounded-2xl overflow-hidden">
                {pa.activation.vendorsBreakdown?.map((v: any) => (
                  <div key={v.id} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-stone-50 transition">
                    <div>
                      <span className="font-bold text-stone-900 block">{v.businessName}</span>
                      <span className="text-[11px] text-stone-400">{v.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500 text-[11px] font-semibold">
                        {v.activeProductsCount} produto(s) ativo(s)
                      </span>
                      {v.isActivated ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Ativado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Em Ativação ({v.activeProductsCount}/3)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CUSTOMER RETENTION METRIC */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block mb-1">
                  Fidelidade & Hábito
                </span>
                <h3 className="font-extrabold text-stone-900 text-base">
                  Retenção e Recorrência Semanal
                </h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-purple-700 block">{pa.retention.consecutiveRetentionRate}%</span>
                <span className="text-[10px] font-bold text-stone-400 block uppercase">Semanas Seguidas</span>
              </div>
            </div>

            {/* Retention Highlight Badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
                <div className="flex items-center gap-1.5 text-purple-800 text-xs font-black">
                  <Flame className="w-4 h-4 text-purple-600" />
                  <span>Semanas Consecutivas</span>
                </div>
                <span className="text-xl font-black text-purple-900 mt-1 block">
                  {pa.retention.consecutiveWeeksCustomersCount} cliente(s)
                </span>
                <span className="text-[10px] text-purple-700 block font-medium mt-0.5">
                  Compram em sábados seguidos
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-1.5 text-stone-700 text-xs font-black">
                  <Repeat className="w-4 h-4 text-stone-500" />
                  <span>Recompra em Datas Distintas</span>
                </div>
                <span className="text-xl font-black text-stone-900 mt-1 block">
                  {pa.retention.repeatCustomersCount} cliente(s)
                </span>
                <span className="text-[10px] text-stone-500 block font-medium mt-0.5">
                  {pa.retention.retentionRate}% da base de compradores
                </span>
              </div>
            </div>

            {/* Customers Recurrence List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800 block">Clientes Identificados e Recorrência:</span>
              <div className="divide-y divide-stone-100 border border-stone-200/80 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                {pa.retention.customers?.map((c: any, idx: number) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-stone-50 transition">
                    <div className="space-y-0.5">
                      <span className="font-bold text-stone-900 block">{c.name}</span>
                      <span className="text-[10px] text-stone-400 block">{c.email}</span>
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {c.weeksActive?.map((w: string, widx: number) => (
                          <span key={widx} className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 text-[9px] font-bold">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      {c.hasConsecutiveWeeks ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">
                          <Flame className="w-3 h-3 text-purple-600" />
                          Fiel da Feira ({c.consecutiveWeeksCount} sem. seguidas)
                        </span>
                      ) : c.differentDatesCount > 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                          <Repeat className="w-3 h-3 text-blue-600" />
                          Recorrente ({c.differentDatesCount} datas)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-semibold">
                          Novo Cliente (1 pedido)
                        </span>
                      )}
                      <span className="text-[10px] text-stone-400 font-medium">
                        Total: {c.ordersCount} pedido(s)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderMonetizationSimulator = () => {
    // Instant calculations (US26)
    const commissionRevenue = (simulatedGMV * simulatedCommissionRate) / 100;
    const proSubscriptionRevenue = simulatedProCount * proMonthlyPrice;
    const projectedTotalRevenue = commissionRevenue + proSubscriptionRevenue;
    const projectedTakeRate = simulatedGMV > 0 ? (projectedTotalRevenue / simulatedGMV) * 100 : 0;

    // Real platform data from stats
    const realGMV = stats?.totalGMV || 0;
    const realRevenue = stats?.totalMonetizationEstimate || ((stats?.subscribersCount || 0) * 49.9 + ((stats?.featuredVendorsCount || 0) * 29.9));
    const realOrders = stats?.totalOrders || 0;
    const realTicketMedio = realOrders > 0 ? (realGMV / realOrders) : 38.5;
    const projectedOrdersCount = realTicketMedio > 0 ? Math.round(simulatedGMV / realTicketMedio) : Math.round(simulatedGMV / 40);
    const realTakeRate = realGMV > 0 ? (realRevenue / realGMV) * 100 : 0;

    // Progress & Comparison
    const revenueGoalAchievement = projectedTotalRevenue > 0 
      ? Math.min(250, Math.round((realRevenue / projectedTotalRevenue) * 100)) 
      : 0;
    const revenueGap = projectedTotalRevenue - realRevenue;

    const applyPreset = (gmv: number, commission: number, pro: number) => {
      setSimulatedGMV(gmv);
      setSimulatedCommissionRate(commission);
      setSimulatedProCount(pro);
    };

    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold backdrop-blur-xs">
                <Sliders className="w-3.5 h-3.5 text-emerald-300" />
                Simulador Financeiro
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Projeções de GMV e Receita</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Simulador de Monetização & Projeção de GMV
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
                Varie o volume transacionado (GMV), comissão e feirantes assinantes Pro para modelar cenários de negócio, estimar receita líquida da plataforma e acompanhar o Take Rate.
              </p>
            </div>

            <button
              onClick={() => applyPreset(30000, 0, 15)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 border border-emerald-400/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 self-start md:self-auto"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-bold shrink-0">
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>Cenários Pré-configurados:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => applyPreset(25000, 0, 15)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                simulatedCommissionRate === 0 && simulatedProCount === 15 && simulatedGMV === 25000
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              Feirae Atual (0% + 15 Pro)
            </button>
            <button
              onClick={() => applyPreset(45000, 2.5, 25)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                simulatedCommissionRate === 2.5 && simulatedProCount === 25 && simulatedGMV === 45000
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              Modelo Híbrido (2.5% + 25 Pro)
            </button>
            <button
              onClick={() => applyPreset(60000, 8, 0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                simulatedCommissionRate === 8 && simulatedProCount === 0 && simulatedGMV === 60000
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              Marketplace Tradicional (8% comissão)
            </button>
            <button
              onClick={() => applyPreset(120000, 1, 50)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                simulatedCommissionRate === 1 && simulatedProCount === 50 && simulatedGMV === 120000
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              Expansão Regional (1% + 50 Pro)
            </button>
          </div>
        </div>

        {/* Main Grid: Controls + Real-Time Results */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Column (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-6">
            <div className="border-b border-stone-100 pb-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mb-1">
                  Parâmetros de Entrada
                </span>
                <h3 className="font-extrabold text-stone-900 text-base">
                  Ajuste os Sliders de Simulação
                </h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
            </div>

            {/* Slider 1: GMV Mensal */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-stone-50/80 border border-stone-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    GMV Mensal Estimado (Volume Transacionado)
                  </label>
                  <span className="text-[11px] text-stone-500 block">
                    Valor total de produtos vendidos pelos feirantes no mês
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 block">
                    {formatCurrency(simulatedGMV)}
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={simulatedGMV}
                onChange={(e) => setSimulatedGMV(Number(e.target.value))}
                className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />

              <div className="flex justify-between text-[10px] font-semibold text-stone-400 pt-0.5">
                <span>R$ 1.000</span>
                <span>R$ 50.000</span>
                <span>R$ 100.000</span>
                <span>R$ 150.000</span>
                <span>R$ 200.000</span>
              </div>
            </div>

            {/* Slider 2: Taxa de Comissão (0% a 15%) */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-stone-50/80 border border-stone-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-purple-600" />
                    Taxa de Comissão da Plataforma (0% a 15%)
                  </label>
                  <span className="text-[11px] text-stone-500 block">
                    {simulatedCommissionRate === 0 
                      ? '0% • Modelo Feirae (zero comissão sobre a colheita do produtor)'
                      : `${simulatedCommissionRate}% retido sobre cada pedido gerado`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-purple-700 block">
                    {simulatedCommissionRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={simulatedCommissionRate}
                onChange={(e) => setSimulatedCommissionRate(Number(e.target.value))}
                className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />

              <div className="flex justify-between text-[10px] font-semibold text-stone-400 pt-0.5">
                <span className="text-emerald-700 font-bold">0% (Isento)</span>
                <span>3.5%</span>
                <span>7.5%</span>
                <span>11.0%</span>
                <span className="text-red-700 font-bold">15% (Máx)</span>
              </div>
            </div>

            {/* Slider 3: Quantidade de Feirantes Pro */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-stone-50/80 border border-stone-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    Quantidade de Feirantes Assinantes Pro
                  </label>
                  <span className="text-[11px] text-stone-500 block">
                    Assinatura recorrente mensal fixa de R$ 49,90 por barraca
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-amber-700 block">
                    {simulatedProCount} <span className="text-xs font-bold text-stone-500">feirantes</span>
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={simulatedProCount}
                onChange={(e) => setSimulatedProCount(Number(e.target.value))}
                className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />

              <div className="flex justify-between text-[10px] font-semibold text-stone-400 pt-0.5">
                <span>0</span>
                <span>25 feirantes</span>
                <span>50 feirantes</span>
                <span>75 feirantes</span>
                <span>100 feirantes</span>
              </div>
            </div>
          </div>

          {/* Instant Results Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Projected Revenue Hero Card */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                  Receita Mensal Projetada
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-black">
                  Take Rate: {projectedTakeRate.toFixed(1)}%
                </span>
              </div>

              <div>
                <span className="text-3xl sm:text-4xl font-black tracking-tight block">
                  {formatCurrency(projectedTotalRevenue)}
                </span>
                <span className="text-xs text-emerald-100/90 font-medium block mt-1">
                  Projeção líquida de faturamento mensal da plataforma
                </span>
              </div>

              <div className="pt-3 border-t border-white/15 space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-emerald-100">Receita de Comissões ({simulatedCommissionRate}%):</span>
                  <span className="font-bold">{formatCurrency(commissionRevenue)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-emerald-100">Receita de Assinaturas Pro ({simulatedProCount} x R$ 49,90):</span>
                  <span className="font-bold">{formatCurrency(proSubscriptionRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Platform Metrics Cards (Ticket Médio & Take Rate) */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-stone-400 block uppercase">Ticket Médio</span>
                <span className="text-xl font-black text-stone-900 block">
                  {formatCurrency(realTicketMedio)}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  Por pedido na feira
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-stone-400 block uppercase">Pedidos Estimados</span>
                <span className="text-xl font-black text-blue-700 block">
                  ~{projectedOrdersCount.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  Para atingir o GMV
                </span>
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-3xl border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-600" />
                  Take Rate Efetivo da Plataforma:
                </span>
                <span className="text-purple-700 font-black text-sm">{projectedTakeRate.toFixed(1)}%</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                O Take Rate representa a porcentagem do GMV total transacionado na feira que se converte em faturamento para o Feirae.
              </p>
            </div>

          </div>

        </div>

        {/* 3. Side-by-side Comparative Visual (Real vs Projected Goal) */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                Comparativo de Faturamento: Real vs Meta Projetada
              </div>
              <h3 className="font-black text-stone-900 text-lg">
                Faturamento Real Acumulado vs Meta Projetada
              </h3>
              <p className="text-xs text-stone-500">
                Acompanhe o grau de realização financeira da feira livre em relação às metas simuladas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-xl text-xs font-bold ${
                realRevenue >= projectedTotalRevenue
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {revenueGoalAchievement}% da Meta Mensal
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Real Platform Accumulation */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-600">
                  Faturamento Real Acumulado
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-800 text-[10px] font-bold">
                  Dado Real
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-stone-900 block">
                  {formatCurrency(realRevenue)}
                </span>
                <span className="text-xs text-stone-500 font-semibold block mt-0.5">
                  Receita real gerada (Assinaturas + Patrocínios)
                </span>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-stone-200/80 text-xs text-stone-700">
                <div className="flex justify-between">
                  <span>GMV Real Movimentado:</span>
                  <span className="font-bold text-stone-900">{formatCurrency(realGMV)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pedidos Reais Concluídos:</span>
                  <span className="font-bold text-stone-900">{realOrders} pedido(s)</span>
                </div>
                <div className="flex justify-between">
                  <span>Take Rate Real Efetivo:</span>
                  <span className="font-bold text-stone-900">{realTakeRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Projected Goal */}
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  Meta Mensal Simulada
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                  Projeção
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 block">
                  {formatCurrency(projectedTotalRevenue)}
                </span>
                <span className="text-xs text-emerald-700 font-semibold block mt-0.5">
                  Meta mensal projetada no simulador
                </span>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-emerald-200 text-xs text-emerald-900">
                <div className="flex justify-between">
                  <span>GMV Projetado:</span>
                  <span className="font-bold">{formatCurrency(simulatedGMV)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pedidos Projetados:</span>
                  <span className="font-bold">~{projectedOrdersCount} pedidos</span>
                </div>
                <div className="flex justify-between">
                  <span>Take Rate Projetado:</span>
                  <span className="font-bold">{projectedTakeRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

          </div>

          {/* Goal Progress Bar & Gap Analysis */}
          <div className="space-y-2 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
              <span>Progresso de Faturamento em Relação à Meta</span>
              <span className="text-emerald-700 font-extrabold">{revenueGoalAchievement}%</span>
            </div>
            <div className="w-full bg-stone-200 h-3.5 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, revenueGoalAchievement)}%` }}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-stone-500 pt-1 gap-1">
              <span>Faturamento Real: {formatCurrency(realRevenue)}</span>
              {realRevenue >= projectedTotalRevenue ? (
                <span className="font-bold text-emerald-700">
                  🎉 Meta Mensal Atingida / Superada por {formatCurrency(realRevenue - projectedTotalRevenue)}!
                </span>
              ) : (
                <span className="font-bold text-amber-700">
                  Faltam {formatCurrency(revenueGap)} para alcançar a meta projetada.
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            Painel Geral de Gestão da Feira
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
            Administração da Feirae
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Moderação de barracas, controle de produtos e métricas de produto (Product Analytics & AARRR).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Filter (Últimos 7 dias, 30 dias ou Geral) */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200 text-xs shadow-xs">
            <div className="flex items-center gap-1 px-2 text-stone-500 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="hidden sm:inline">Período:</span>
            </div>
            <button
              onClick={() => handlePeriodChange('7d')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                period === '7d'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              7 dias
            </button>
            <button
              onClick={() => handlePeriodChange('30d')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                period === '30d'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              30 dias
            </button>
            <button
              onClick={() => handlePeriodChange('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                period === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              Geral
            </button>
          </div>

          {pendingVendorsCount > 0 && (
            <button
              onClick={() => setActiveTab('VENDORS')}
              className="p-2.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-2 text-xs font-bold shadow-xs hover:bg-amber-100 transition cursor-pointer"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{pendingVendorsCount} barraca(s) pendente(s)</span>
            </button>
          )}

          {pendingCertsCount > 0 && (
            <button
              onClick={() => setActiveTab('CERT_MODERATION')}
              className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2 text-xs font-bold shadow-xs hover:bg-emerald-100 transition cursor-pointer"
            >
              <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pendingCertsCount} selo(s) para homologar</span>
            </button>
          )}
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Central Divisions Tabs */}
      <div className="flex flex-wrap border-b border-stone-200 gap-2 sm:gap-6 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'border-purple-600 text-purple-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Visão Geral & Indicadores
        </button>

        <button
          onClick={() => setActiveTab('AARRR')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'AARRR'
              ? 'border-purple-600 text-purple-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-purple-600" />
          Métricas de Produto (AARRR)
        </button>

        <button
          onClick={() => setActiveTab('SIMULATOR')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'SIMULATOR'
              ? 'border-emerald-600 text-emerald-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-600" />
          Simulador & GMV
        </button>

        <button
          onClick={() => setActiveTab('VENDORS')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'VENDORS'
              ? 'border-purple-600 text-purple-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Store className="w-4 h-4" />
          Moderação de Barracas
          {pendingVendorsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
              {pendingVendorsCount} pendente(s)
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'PRODUCTS'
              ? 'border-purple-600 text-purple-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Controle de Produtos
          <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-[10px] text-stone-600 font-extrabold">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CERT_MODERATION')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'CERT_MODERATION'
              ? 'border-emerald-600 text-emerald-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Leaf className="w-4 h-4 text-emerald-600" />
          Moderação de Selos
          {pendingCertsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold animate-pulse">
              {pendingCertsCount}
            </span>
          )}
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-in fade-in">
          
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-400 block uppercase tracking-wider">Feirantes Ativos</span>
                <span className="text-2xl sm:text-3xl font-black text-stone-900 mt-1 block">{stats.activeVendors}</span>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Exibidos na vitrine</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-400 block uppercase tracking-wider">Total Pedidos</span>
                <span className="text-2xl sm:text-3xl font-black text-stone-900 mt-1 block">{stats.totalOrders}</span>
                <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Acumulados</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-400 block uppercase tracking-wider">Volume (GMV)</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 block">{formatCurrency(stats.totalGMV)}</span>
                <span className="text-[11px] text-stone-500 font-semibold mt-1 block">Movimentado na feira</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-400 block uppercase tracking-wider">Assinaturas MRR</span>
                <span className="text-2xl sm:text-3xl font-black text-purple-700 mt-1 block">{formatCurrency(stats.subscribersCount * 49.9)}</span>
                <span className="text-[11px] text-purple-600 font-semibold mt-1 block">R$ 49,90/mês</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-amber-300/80 shadow-xs flex items-center justify-between bg-gradient-to-br from-amber-50/40 to-white">
              <div>
                <span className="text-xs font-semibold text-amber-900 block uppercase tracking-wider">Patrocínios</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 block">
                  {formatCurrency(stats.sponsorshipRevenue || (stats.featuredVendorsCount || 0) * 29.9)}
                </span>
                <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
                  {stats.featuredVendorsCount || 0} barraca(s) ativas
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 fill-amber-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-3">
              <h3 className="font-extrabold text-stone-900 text-base">Faturamento & Monetização da Feira</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                A <strong>Feirae</strong> monetiza com <strong>Assinatura Fixa Mensal</strong> (R$ 49,90) e <strong>Destaques Patrocinados</strong> (R$ 29,90/semana), mantendo 0% de comissão de intermediação para os produtores.
              </p>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Receita Recorrente de Assinaturas (MRR):</span>
                  <span className="text-feira-800">{formatCurrency(stats.subscribersCount * 49.9)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Receita de Destaques Patrocinados (US19):</span>
                  <span className="text-amber-700">{formatCurrency(stats.sponsorshipRevenue || (stats.featuredVendorsCount || 0) * 29.9)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-stone-900 pt-1.5 border-t border-stone-200">
                  <span>Faturamento Total Simulado da Plataforma:</span>
                  <span className="text-emerald-700 font-black text-sm">
                    {formatCurrency(stats.totalMonetizationEstimate || (stats.subscribersCount * 49.9 + (stats.featuredVendorsCount || 0) * 29.9))}
                  </span>
                </div>
                <div className="flex justify-between text-stone-500 pt-1">
                  <span>Economia gerada para os feirantes vs marketplaces:</span>
                  <span className="text-emerald-600 font-bold">~ {formatCurrency(stats.totalGMV * 0.15)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-3">
              <h3 className="font-extrabold text-stone-900 text-base">Impacto na Redução de Desperdício</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Com o pré-agendamento de colheita baseado nas reservas dos clientes, os feirantes reduzem drasticamente as sobras ao final da feira livre.
              </p>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Meta de Redução de Sobras:</span>
                  <span>-35% no Hortifrúti</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Maior previsibilidade de colheita na madrugada anterior à feira livre.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-stone-900 text-base">Distribuição dos Pedidos por Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                <span className="text-amber-800 font-bold block text-lg">{stats.ordersByStatus.novo}</span>
                <span className="text-stone-500 text-[11px]">Novos</span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                <span className="text-blue-800 font-bold block text-lg">{stats.ordersByStatus.em_preparo}</span>
                <span className="text-stone-500 text-[11px]">Em Preparo</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="text-emerald-800 font-bold block text-lg">{stats.ordersByStatus.pronto}</span>
                <span className="text-stone-500 text-[11px]">Prontos</span>
              </div>
              <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200">
                <span className="text-stone-800 font-bold block text-lg">{stats.ordersByStatus.retirado}</span>
                <span className="text-stone-500 text-[11px]">Retirados</span>
              </div>
              <div className="p-3 rounded-2xl bg-red-50 border border-red-100">
                <span className="text-red-800 font-bold block text-lg">{stats.ordersByStatus.cancelado}</span>
                <span className="text-stone-500 text-[11px]">Cancelados</span>
              </div>
            </div>
          </div>

          {/* Section: Product Analytics (AARRR) & Funnel */}
          {renderProductAnalytics()}

          {/* Section: Monetization Simulator & GMV Projections (US26) */}
          {renderMonetizationSimulator()}

        </div>
      )}

      {/* ================= TAB 2: MÉTRICAS DE PRODUTO (AARRR) ================= */}
      {activeTab === 'AARRR' && (
        <div className="space-y-8 animate-in fade-in">
          {renderProductAnalytics()}
        </div>
      )}

      {/* ================= TAB 3: SIMULADOR DE MONETIZAÇÃO & GMV (US26) ================= */}
      {activeTab === 'SIMULATOR' && (
        <div className="space-y-8 animate-in fade-in">
          {renderMonetizationSimulator()}
        </div>
      )}

      {/* ================= TAB 3: VENDORS MODERATION ================= */}
      {activeTab === 'VENDORS' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-stone-900 text-lg">Moderação & Aprovação de Barracas</h3>
              <p className="text-xs text-stone-500">
                Novos feirantes cadastrados iniciam em análise e necessitam da sua autorização para aparecer na vitrine pública
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={vendorSearch}
                  onChange={e => setVendorSearch(e.target.value)}
                  placeholder="Buscar barraca, feirante ou e-mail..."
                  className="pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-64"
                />
              </div>

              <div className="flex rounded-xl bg-stone-100 p-1 text-[11px] font-bold">
                <button
                  onClick={() => setVendorStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition ${vendorStatusFilter === 'ALL' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'}`}
                >
                  Todas ({vendors.length})
                </button>
                <button
                  onClick={() => setVendorStatusFilter('PENDING')}
                  className={`px-2.5 py-1 rounded-lg transition ${vendorStatusFilter === 'PENDING' ? 'bg-white text-amber-900 shadow-2xs' : 'text-stone-500'}`}
                >
                  Pendentes ({pendingVendorsCount})
                </button>
                <button
                  onClick={() => setVendorStatusFilter('ACTIVE')}
                  className={`px-2.5 py-1 rounded-lg transition ${vendorStatusFilter === 'ACTIVE' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-stone-500'}`}
                >
                  Ativas ({vendors.filter(v => v.active === true).length})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Barraca / Marca</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Localização na Feira</th>
                  <th className="p-3.5">Contato do Feirante</th>
                  <th className="p-3.5">Status de Moderação</th>
                  <th className="p-3.5">Destaque Patrocinado</th>
                  <th className="p-3.5 text-right">Ação do Administrador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      Nenhuma barraca encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map(v => (
                    <tr key={v.id} className={`hover:bg-stone-50/60 transition ${v.active === false ? 'bg-amber-50/20' : ''}`}>
                      <td className="p-3.5">
                        <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                          <span>{v.businessName}</span>
                          <Link
                            href={`/feirantes/${v.slug || v.id}`}
                            target="_blank"
                            className="text-stone-400 hover:text-stone-700"
                            title="Visualizar barraca"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          Responsável: {v.user?.name || 'Feirante'}
                        </div>
                      </td>

                      <td className="p-3.5 font-medium text-stone-700">
                        {v.category}
                      </td>

                      <td className="p-3.5 text-stone-600 text-[11px]">
                        {v.fairLocation} {v.boothNumber && `(${v.boothNumber})`}
                      </td>

                      <td className="p-3.5 space-y-0.5 text-[11px] text-stone-500">
                        {v.user?.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-stone-400" /> {v.user.email}</div>}
                        {v.user?.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-stone-400" /> {v.user.phone}</div>}
                      </td>

                      <td className="p-3.5">
                        {v.active === true ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Aprovada & Ativa
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-700" /> Aguardando Aprovação
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {v.isFeatured ? (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-fit">
                              <Sparkles className="w-3 h-3 text-amber-700 fill-amber-500" /> Patrocinada
                            </span>
                            {v.featuredUntil && (
                              <div className="text-[10px] text-stone-500 font-mono">
                                até {new Date(v.featuredUntil).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400">
                            Padrão (Sem destaque)
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.isFeatured ? (
                            <button
                              onClick={() => handleToggleFeaturedVendor(v.id, true)}
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition flex items-center gap-1 cursor-pointer"
                              title="Pausar destaque patrocinado"
                            >
                              <Sparkles className="w-3 h-3 text-amber-700" />
                              <span>Pausar Destaque</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleFeaturedVendor(v.id, false)}
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-stone-200 text-stone-700 hover:bg-stone-100 transition flex items-center gap-1 cursor-pointer"
                              title="Ativar destaque patrocinado por 7 dias"
                            >
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>Ativar Destaque</span>
                            </button>
                          )}

                          {v.active === true ? (
                            <button
                              onClick={() => handleToggleVendor(v.id, true)}
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-red-200 text-red-600 hover:bg-red-50 transition flex items-center gap-1 cursor-pointer"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Pausar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleVendor(v.id, false)}
                              className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Aprovar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PRODUCTS CATALOG CONTROL ================= */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-stone-900 text-lg">Controle Global de Produtos</h3>
              <p className="text-xs text-stone-500">Monitore os produtos cadastrados pelos feirantes no ecossistema</p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Buscar por produto, categoria ou barraca..."
                className="pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Produto</th>
                  <th className="p-3.5">Barraca Ofertante</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Preço</th>
                  <th className="p-3.5">Estoque</th>
                  <th className="p-3.5">Orgânico</th>
                  <th className="p-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map(p => (
                  <tr key={p.id} className={`hover:bg-stone-50/60 transition ${!p.isActive ? 'opacity-40 bg-stone-50' : ''}`}>
                    <td className="p-3.5 font-bold text-stone-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <span>{p.name}</span>
                    </td>

                    <td className="p-3.5 font-medium text-stone-700">
                      {p.vendorName}
                    </td>

                    <td className="p-3.5 text-stone-600">
                      {p.category}
                    </td>

                    <td className="p-3.5 font-bold text-stone-900">
                      {formatCurrency(p.price)} <span className="text-stone-400 font-normal">/{p.unit}</span>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-stone-100 text-stone-800">
                        {p.stock} {p.unit}s
                      </span>
                    </td>

                    <td className="p-3.5">
                      {p.isOrganic ? (
                        <span className="text-emerald-700 font-bold text-[11px]">✓ Orgânico</span>
                      ) : (
                        <span className="text-stone-400 text-[11px]">Convencional</span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleToggleProduct(p.id, p.isActive)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          p.isActive
                            ? 'text-stone-500 hover:text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50 font-bold'
                        }`}
                      >
                        {p.isActive ? 'Ocultar' : 'Reativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB: MODERAÇÃO DE SELOS ORGÂNICOS (US27) ================= */}
      {activeTab === 'CERT_MODERATION' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold backdrop-blur-xs">
                  <Leaf className="w-3.5 h-3.5 text-emerald-300" />
                  Homologação de Selos
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Auditoria de Autenticidade Orgânica</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Fila de Moderação de Selos de Produtor Orgânico
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
                  Avalie os comprovantes e números de registro enviados pelos feirantes. Ao aprovar, a barraca e seus produtos recebem o selo <strong>🌿 Orgânico Certificado</strong> com resposta automática aos filtros da vitrine.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center min-w-[100px]">
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">Pendentes</span>
                  <span className="text-2xl font-black text-white">{pendingCertsCount}</span>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center min-w-[100px]">
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">Homologados</span>
                  <span className="text-2xl font-black text-emerald-300">{approvedCertsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between bg-gradient-to-br from-amber-50/40 to-white">
              <div>
                <span className="text-xs font-semibold text-amber-800 block uppercase tracking-wider">Aguardando Avaliação</span>
                <span className="text-2xl font-black text-amber-900 mt-1 block">{pendingCertsCount}</span>
                <span className="text-[11px] text-amber-700 font-semibold mt-0.5 block">Documentos na fila</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between bg-gradient-to-br from-emerald-50/40 to-white">
              <div>
                <span className="text-xs font-semibold text-emerald-800 block uppercase tracking-wider">Selos Ativos na Vitrine</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{approvedCertsCount}</span>
                <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Produtores auditados</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-400 block uppercase tracking-wider">Solicitações Recusadas</span>
                <span className="text-2xl font-black text-stone-700 mt-1 block">{rejectedCertsCount}</span>
                <span className="text-[11px] text-stone-500 font-semibold mt-0.5 block">Com justificativa enviada</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-stone-900 text-lg">Fila de Solicitações de Certificação</h3>
                <p className="text-xs text-stone-500">
                  Verifique a validade do documento anexado e confirme a conformidade cadastral
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={certSearch}
                    onChange={e => setCertSearch(e.target.value)}
                    placeholder="Buscar barraca, órgão ou SisOrg..."
                    className="pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64"
                  />
                </div>

                <div className="flex rounded-xl bg-stone-100 p-1 text-[11px] font-bold">
                  <button
                    onClick={() => setCertStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${certStatusFilter === 'ALL' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'}`}
                  >
                    Todas ({vendors.filter(v => v.certStatus && v.certStatus !== 'NONE').length})
                  </button>
                  <button
                    onClick={() => setCertStatusFilter('PENDING')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${certStatusFilter === 'PENDING' ? 'bg-white text-amber-900 shadow-2xs' : 'text-stone-500'}`}
                  >
                    Pendentes ({pendingCertsCount})
                  </button>
                  <button
                    onClick={() => setCertStatusFilter('APPROVED')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${certStatusFilter === 'APPROVED' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-stone-500'}`}
                  >
                    Homologadas ({approvedCertsCount})
                  </button>
                  <button
                    onClick={() => setCertStatusFilter('REJECTED')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${certStatusFilter === 'REJECTED' ? 'bg-white text-red-900 shadow-2xs' : 'text-stone-500'}`}
                  >
                    Recusadas ({rejectedCertsCount})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Barraca / Feirante</th>
                    <th className="p-3.5">Órgão Emissor / Certificadora</th>
                    <th className="p-3.5">Nº Registro (SisOrg/MAPA)</th>
                    <th className="p-3.5">Documento Comprobatório</th>
                    <th className="p-3.5">Data Submissão</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Ação do Administrador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCerts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-400">
                        Nenhuma solicitação de selo encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredCerts.map(v => (
                      <tr key={v.id} className={`hover:bg-stone-50/60 transition ${v.certStatus === 'PENDING' ? 'bg-amber-50/30' : ''}`}>
                        
                        {/* Vendor Name & Info */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                              {v.avatar ? (
                                <img src={v.avatar} alt={v.businessName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-400">
                                  <Store className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-extrabold text-stone-900 flex items-center gap-1.5">
                                {v.businessName}
                                {v.isCertifiedOrganic && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-black border border-emerald-300">
                                    🌿 Selo Ativo
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-400">{v.fairLocation}</div>
                            </div>
                          </div>
                        </td>

                        {/* Issuing Agency */}
                        <td className="p-3.5 text-stone-700 font-medium">
                          {v.certIssuingBody || <span className="text-stone-400 italic">Não informado</span>}
                        </td>

                        {/* Registration Number */}
                        <td className="p-3.5">
                          {v.certRegistrationNumber ? (
                            <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                              {v.certRegistrationNumber}
                            </span>
                          ) : (
                            <span className="text-stone-400 italic">-</span>
                          )}
                        </td>

                        {/* Document */}
                        <td className="p-3.5">
                          {v.certificationDocUrl ? (
                            <button
                              onClick={() => setPreviewingDocUrl(v.certificationDocUrl)}
                              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Inspecionar Doc</span>
                            </button>
                          ) : (
                            <span className="text-stone-400 italic">Sem anexo</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="p-3.5 text-stone-500 text-[11px]">
                          {v.certSubmittedAt ? (
                            <span>{new Date(v.certSubmittedAt).toLocaleDateString('pt-BR')}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-3.5">
                          {v.certStatus === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Homologado
                            </span>
                          )}
                          {v.certStatus === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Em Análise
                            </span>
                          )}
                          {v.certStatus === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800" title={v.certRejectionReason || ''}>
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              Recusado
                            </span>
                          )}
                          {(!v.certStatus || v.certStatus === 'NONE') && (
                            <span className="text-stone-400 text-[11px]">Não Solicitado</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                          {v.certStatus === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApproveCert(v.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Aprovar Selo
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingVendorId(v.id);
                                  setRejectionReasonInput('');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold transition cursor-pointer inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Recusar
                              </button>
                            </>
                          )}

                          {v.certStatus === 'APPROVED' && (
                            <button
                              onClick={() => handleRevokeCert(v.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-stone-200 text-stone-600 font-semibold transition cursor-pointer inline-flex items-center gap-1 text-[11px]"
                            >
                              Revogar Selo
                            </button>
                          )}

                          {v.certStatus === 'REJECTED' && (
                            <button
                              onClick={() => handleApproveCert(v.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition cursor-pointer text-[11px]"
                            >
                              Reconsiderar / Aprovar
                            </button>
                          )}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Modal: Inspecionar Documento do Certificado */}
      {previewingDocUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Comprovante de Certificação Orgânica</h3>
                  <p className="text-[11px] text-stone-500">Documento anexado pelo feirante para validação da moderação</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewingDocUrl(null)}
                className="p-1.5 rounded-full hover:bg-stone-200/60 transition text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <div className="rounded-2xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center min-h-[300px]">
                <img
                  src={previewingDocUrl}
                  alt="Comprovante de Certificado"
                  className="w-full h-auto max-h-[460px] object-contain"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="truncate max-w-sm font-mono text-[11px]">{previewingDocUrl}</span>
                <a
                  href={previewingDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir em Nova Aba
                </a>
              </div>
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
              <button
                onClick={() => setPreviewingDocUrl(null)}
                className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Justificativa de Recusa de Selo */}
      {rejectingVendorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-red-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Recusar Solicitação de Selo</h3>
                  <p className="text-[11px] text-stone-500">Informe o motivo da não aprovação para o feirante</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingVendorId(null)}
                className="p-1.5 rounded-full hover:bg-stone-200/60 transition text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-bold text-stone-700 block mb-1">Selecione uma justificativa rápida:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRejectionReasonInput('Documento ilegível ou com baixa resolução.')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] cursor-pointer"
                  >
                    Documento Ilegível
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectionReasonInput('Prazo de validade do certificado expirado.')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] cursor-pointer"
                  >
                    Certificado Vencido
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectionReasonInput('Número de registro não localizado no Cadastro Nacional SisOrg/MAPA.')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] cursor-pointer"
                  >
                    Registro Não Localizado
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectionReasonInput('Divergência entre o titular do certificado e o cadastro da barraca.')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] cursor-pointer"
                  >
                    Divergência Cadastral
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Mensagem / Justificativa detalhada:
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReasonInput}
                  onChange={e => setRejectionReasonInput(e.target.value)}
                  placeholder="Explique o que precisa ser corrigido para que o feirante reenvie..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingVendorId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectCert(rejectingVendorId, rejectionReasonInput)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
                >
                  Confirmar Recusa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
