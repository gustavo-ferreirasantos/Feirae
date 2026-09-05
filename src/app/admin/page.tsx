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
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useUser } from '@/lib/user-context';
import { LoginModal } from '@/components/LoginModal';

export default function AdminDashboardPage() {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'VENDORS' | 'PRODUCTS'>('OVERVIEW');
  const [stats, setStats] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorStatusFilter, setVendorStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [productSearch, setProductSearch] = useState('');

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const loadAdminData = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      const [statsRes, vendRes, prodRes] = await Promise.all([
        fetch('/api/admin/stats'),
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
        const statsRes = await fetch('/api/admin/stats');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            Painel Geral de Gestão da Feira
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
            Administração da Feirae
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Moderação de barracas, controle de produtos e indicadores econômicos da feira livre.
          </p>
        </div>

        {pendingVendorsCount > 0 && (
          <button
            onClick={() => setActiveTab('VENDORS')}
            className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-2.5 text-xs font-bold shadow-xs hover:bg-amber-100 transition cursor-pointer"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{pendingVendorsCount} barraca(s) aguardando aprovação</span>
          </button>
        )}
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

        </div>
      )}

      {/* ================= TAB 2: VENDORS MODERATION ================= */}
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

    </div>
  );
}
