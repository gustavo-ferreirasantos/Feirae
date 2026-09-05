'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Store, 
  Sparkles, 
  MapPin, 
  Clock, 
  Leaf, 
  ShieldCheck, 
  ArrowRight,
  ShoppingBag,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { Product, Vendor } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { VendorCard } from '@/components/VendorCard';
import { useFair } from '@/lib/fair-context';

const CATEGORIES = [
  'Todos',
  'Hortaliças',
  'Legumes',
  'Frutas',
  'Queijos',
  'Panificação',
  'Doces & Geleias',
  'Laticínios',
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [featuredVendors, setFeaturedVendors] = useState<Vendor[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, vendRes, featRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/vendors'),
          fetch('/api/vendors/featured'),
        ]);
        if (prodRes.ok) setProducts(await prodRes.json());
        if (vendRes.ok) setVendors(await vendRes.json());
        if (featRes.ok) setFeaturedVendors(await featRes.json());
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const { selectedFairId, selectedFair } = useFair();

  const filteredVendors = vendors.filter(v => {
    if (!v.active) return false;
    if (selectedFairId === 'ALL' || !selectedFair) return true;

    // Check if vendor has matching fair location relation
    const matchesFairRelation = v.fairLocations?.some(
      vf => (vf.fairLocationId === selectedFair.id || vf.fairLocationId === selectedFair.slug) && vf.active
    );
    if (matchesFairRelation) return true;

    // Fallback match on fairLocation text
    const locLower = (v.fairLocation || '').toLowerCase();
    if (selectedFair.id === 'fair-1' && (locLower.includes('matriz') || locLower.includes('centro'))) return true;
    if (selectedFair.id === 'fair-2' && locLower.includes('bairro novo')) return true;
    if (selectedFair.id === 'fair-3' && (locLower.includes('parque') || locLower.includes('agroecol'))) return true;

    return false;
  });

  const filteredFeaturedVendors = featuredVendors.filter(v => {
    return filteredVendors.some(fv => fv.id === v.id);
  });

  const activeFilteredVendorIds = new Set(filteredVendors.map(v => v.id));

  const filteredProducts = products.filter(p => {
    if (vendors.length > 0 && !activeFilteredVendorIds.has(p.vendorId)) return false;
    const matchCategory = selectedCategory === 'Todos' || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const query = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || 
      p.name.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query) ||
      p.vendorName?.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query);
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-feira-50 via-emerald-50/40 to-stone-50 border-b border-feira-100 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-feira-100 border border-feira-200 text-feira-800 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Garantia de frescor direto do produtor</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
              Faça seu pré-pedido na <span className="text-feira-600">feira local</span> e retire sem filas.
            </h1>
            
            <p className="mt-4 text-base sm:text-lg text-stone-600 leading-relaxed">
              Ajude pequenos produtores a preverem a demanda e evite desperdícios. Reserve verduras, queijos, pães e doces artesanais antes do dia da feira física.
            </p>

            {/* Search Bar */}
            <div className="mt-8 flex flex-col sm:flex-row gap-2 max-w-2xl bg-white p-2 rounded-2xl shadow-lg border border-stone-200">
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search className="w-5 h-5 text-stone-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar alface, queijo canastra, geleia, tomate..."
                  className="w-full text-sm bg-transparent focus:outline-none text-stone-800 placeholder:text-stone-400 py-2"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-stone-400 hover:text-stone-600 px-2"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Value Props Pills */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-stone-600">
              <span className="flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-emerald-600" /> Produtos frescos colhidos no dia
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Janelas de retirada programadas
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Sem taxas abusivas / Pagamento na entrega
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Active Fair Filter Indicator Banner */}
      {selectedFair && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-emerald-50 via-feira-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                    Feira Selecionada
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    {Array.isArray(selectedFair.operatingDays) ? selectedFair.operatingDays.join(', ') : selectedFair.operatingDays}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900">
                  {selectedFair.name} — <span className="font-normal text-stone-600">{selectedFair.address}, {selectedFair.city}</span>
                </h3>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  Horário: {selectedFair.schedule}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-xs font-semibold text-stone-600 bg-white/80 border border-stone-200 px-2.5 py-1 rounded-lg">
                {filteredVendors.length} {filteredVendors.length === 1 ? 'barraca ativa' : 'barracas ativas'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Categories Filter Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-stone-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600">Categorias</h2>
          </div>
          {selectedCategory !== 'Todos' && (
            <button
              onClick={() => setSelectedCategory('Todos')}
              className="text-xs text-feira-700 font-semibold hover:underline"
            >
              Ver todas
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Top Section: Sponsored / Featured Vendors (US19) */}
      {filteredFeaturedVendors.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-amber-50/70 via-stone-50/50 to-emerald-50/40 border border-amber-300/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles className="w-5 h-5 fill-stone-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                      Barracas em Destaque na Feira
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-950 shadow-xs uppercase tracking-wider">
                      Patrocinado
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Produtores com colheita fresca garantida e atendimento prioritário na feira livre
                  </p>
                </div>
              </div>

              <Link
                href="/feirantes"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-200/60 hover:bg-amber-200 px-3.5 py-2 rounded-xl transition w-fit"
              >
                <span>Conhecer todos os feirantes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFeaturedVendors.map(vendor => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Vendors Carousel/Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">Feirantes & Produtores Locais</h2>
            <p className="text-xs text-stone-500 mt-0.5">Visite as barracas digitais e veja os catálogos completos</p>
          </div>
          <Link
            href="/feirantes"
            className="text-xs font-bold text-feira-700 hover:text-feira-900 flex items-center gap-1"
          >
            Ver todos ({filteredVendors.length}) <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredVendors.slice(0, 3).map(vendor => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">
              {selectedCategory === 'Todos' ? 'Produtos Disponíveis para Pré-pedido' : `Produtos em "${selectedCategory}"`}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {filteredProducts.length} itens encontrados prontos para reserva
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 max-w-lg mx-auto">
            <Store className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800">Nenhum produto encontrado</h3>
            <p className="text-xs text-stone-500 mt-1">
              Tente buscar por outro termo ou selecione uma categoria diferente acima.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('Todos');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-feira-600 text-white rounded-xl text-xs font-semibold"
            >
              Resetar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* How it works info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-tr from-stone-900 to-stone-800 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-feira-400">Como funciona o FeiraLocal</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-2 leading-tight">
              Apoie o pequeno comércio com 3 passos simples
            </h2>
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-feira-600/30 border border-feira-500/50 flex items-center justify-center font-bold text-feira-300">
                  1
                </div>
                <h4 className="font-bold text-sm text-stone-100">Escolha os Produtos</h4>
                <p className="text-stone-400 leading-relaxed">
                  Monte seu carrinho navegando pelas barracas virtuais dos feirantes da sua região.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-feira-600/30 border border-feira-500/50 flex items-center justify-center font-bold text-feira-300">
                  2
                </div>
                <h4 className="font-bold text-sm text-stone-100">Reserve sem Pagar Agora</h4>
                <p className="text-stone-400 leading-relaxed">
                  Defina o horário de retirada na feira. Pague presencialmente ou simule no Mercado Pago Sandbox.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-feira-600/30 border border-feira-500/50 flex items-center justify-center font-bold text-feira-300">
                  3
                </div>
                <h4 className="font-bold text-sm text-stone-100">Retire na Barraca</h4>
                <p className="text-stone-400 leading-relaxed">
                  Chegue na feira física e pegue seus produtos já separados, frescos e sem perder tempo em filas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
