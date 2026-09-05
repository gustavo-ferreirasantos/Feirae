'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  MapPin, 
  Store, 
  Search, 
  Sparkles, 
  Clock, 
  MessageCircle, 
  ExternalLink, 
  CheckCircle2, 
  ShoppingBag, 
  Navigation, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  X, 
  Calendar, 
  Star, 
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { Vendor, Order } from '@/types';
import { useUser } from '@/lib/user-context';
import { getVendorContactLink } from '@/lib/whatsapp';
import { formatCurrency } from '@/lib/utils';

// Layout geometry definition for booths in Praça da Matriz (32 booth spots)
interface BoothLayoutSpot {
  id: string; // e.g. 'B-14'
  sector: 'A' | 'B' | 'C' | 'D';
  sectorName: string;
  categoryDefault: string;
  x: number;
  y: number;
  rotation?: number;
}

// 32 booth slots arranged in 4 tree-lined avenues surrounding the central gazebo
const BOOTH_SPOTS: BoothLayoutSpot[] = [
  // SETOR A: Alameda Norte (Hortifrúti & Orgânicos)
  { id: 'B-01', sector: 'A', sectorName: 'Alameda dos Orgânicos', categoryDefault: 'Hortifrúti', x: 210, y: 130 },
  { id: 'B-02', sector: 'A', sectorName: 'Alameda dos Orgânicos', categoryDefault: 'Hortifrúti', x: 290, y: 130 },
  { id: 'B-03', sector: 'A', sectorName: 'Alameda dos Orgânicos', categoryDefault: 'Hortifrúti', x: 370, y: 130 },
  { id: 'B-04', sector: 'A', sectorName: 'Alameda dos Orgânicos', categoryDefault: 'Hortifrúti', x: 450, y: 130 },
  { id: 'B-13', sector: 'A', sectorName: 'Alameda dos Orgânicos', categoryDefault: 'Hortifrúti', x: 550, y: 130 },
  { id: 'B-14', sector: 'A', sectorName: 'Alameda dos Orgânicos', categoryDefault: 'Hortifrúti', x: 630, y: 130 }, // Horta & Pomar do Zé
  { id: 'B-15', sector: 'A', sectorName: 'Alameda dos Orgânicos', categoryDefault: 'Hortifrúti', x: 710, y: 130 },
  { id: 'B-16', sector: 'A', sectorName: 'Alameda dos Orgânicos', categoryDefault: 'Hortifrúti', x: 790, y: 130 },

  // SETOR B: Alameda Sul (Doces, Panificação & Artesanais)
  { id: 'B-05', sector: 'B', sectorName: 'Alameda das Delícias', categoryDefault: 'Doces & Panificação', x: 210, y: 510 },
  { id: 'B-06', sector: 'B', sectorName: 'Alameda das Delícias', categoryDefault: 'Doces & Panificação', x: 290, y: 510 },
  { id: 'B-07', sector: 'B', sectorName: 'Alameda das Delícias', categoryDefault: 'Doces & Panificação', x: 370, y: 510 },
  { id: 'B-08', sector: 'B', sectorName: 'Alameda das Delícias', categoryDefault: 'Doces & Panificação', x: 450, y: 510 }, // Delícias da Neusa
  { id: 'B-09', sector: 'B', sectorName: 'Alameda das Delícias', categoryDefault: 'Doces & Panificação', x: 550, y: 510 },
  { id: 'B-10', sector: 'B', sectorName: 'Alameda das Delícias', categoryDefault: 'Doces & Panificação', x: 630, y: 510 },
  { id: 'B-11', sector: 'B', sectorName: 'Alameda das Delícias', categoryDefault: 'Doces & Panificação', x: 710, y: 510 },
  { id: 'B-12', sector: 'B', sectorName: 'Alameda das Delícias', categoryDefault: 'Doces & Panificação', x: 790, y: 510 },

  // SETOR C: Alameda Leste (Queijarias & Laticínios)
  { id: 'B-17', sector: 'C', sectorName: 'Alameda dos Laticínios', categoryDefault: 'Queijos & Laticínios', x: 860, y: 210 },
  { id: 'B-18', sector: 'C', sectorName: 'Alameda dos Laticínios', categoryDefault: 'Queijos & Laticínios', x: 860, y: 270 },
  { id: 'B-19', sector: 'C', sectorName: 'Alameda dos Laticínios', categoryDefault: 'Queijos & Laticínios', x: 860, y: 330 },
  { id: 'B-20', sector: 'C', sectorName: 'Alameda dos Laticínios', categoryDefault: 'Queijos & Laticínios', x: 860, y: 390 },
  { id: 'B-21', sector: 'C', sectorName: 'Alameda dos Laticínios', categoryDefault: 'Queijos & Laticínios', x: 860, y: 450 },
  { id: 'B-22', sector: 'C', sectorName: 'Alameda dos Laticínios', categoryDefault: 'Queijos & Laticínios', x: 750, y: 320 }, // Queijaria Artesanal da Serra
  { id: 'B-23', sector: 'C', sectorName: 'Alameda dos Laticínios', categoryDefault: 'Queijos & Laticínios', x: 750, y: 390 },
  { id: 'B-24', sector: 'C', sectorName: 'Alameda dos Laticínios', categoryDefault: 'Queijos & Laticínios', x: 750, y: 250 },

  // SETOR D: Alameda Oeste (Pastel, Caldo de Cana & Gastronomia)
  { id: 'B-25', sector: 'D', sectorName: 'Alameda Gastronômica', categoryDefault: 'Pastéis & Salgados', x: 140, y: 210 },
  { id: 'B-26', sector: 'D', sectorName: 'Alameda Gastronômica', categoryDefault: 'Pastéis & Salgados', x: 140, y: 270 },
  { id: 'B-27', sector: 'D', sectorName: 'Alameda Gastronômica', categoryDefault: 'Pastéis & Salgados', x: 140, y: 330 },
  { id: 'B-28', sector: 'D', sectorName: 'Alameda Gastronômica', categoryDefault: 'Pastéis & Salgados', x: 140, y: 390 },
  { id: 'B-29', sector: 'D', sectorName: 'Alameda Gastronômica', categoryDefault: 'Pastéis & Salgados', x: 140, y: 450 },
  { id: 'B-30', sector: 'D', sectorName: 'Alameda Gastronômica', categoryDefault: 'Temperos & Ervas', x: 250, y: 320 },
  { id: 'B-31', sector: 'D', sectorName: 'Alameda Gastronômica', categoryDefault: 'Temperos & Ervas', x: 250, y: 390 },
  { id: 'B-32', sector: 'D', sectorName: 'Alameda Gastronômica', categoryDefault: 'Grãos & Cereais', x: 250, y: 250 },
];

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; tentColor: string; canopyPattern: string }> = {
  'Hortifrúti': { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-950', tentColor: '#059669', canopyPattern: '#10b981' },
  'Doces & Panificação': { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-amber-950', tentColor: '#d97706', canopyPattern: '#f59e0b' },
  'Queijos & Laticínios': { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-950', tentColor: '#2563eb', canopyPattern: '#3b82f6' },
  'Pastéis & Salgados': { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-rose-950', tentColor: '#e11d48', canopyPattern: '#f43f5e' },
  'Temperos & Ervas': { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-teal-950', tentColor: '#0d9488', canopyPattern: '#14b8a6' },
  'Grãos & Cereais': { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-950', tentColor: '#ea580c', canopyPattern: '#f97316' },
  'Outros': { bg: 'bg-stone-500', border: 'border-stone-600', text: 'text-stone-950', tentColor: '#78716c', canopyPattern: '#a8a29e' },
};

function normalizeBoothId(boothStr?: string): string {
  if (!boothStr) return '';
  const match = boothStr.match(/\d+/);
  if (!match) return boothStr.trim().toUpperCase();
  const num = parseInt(match[0], 10);
  return `B-${String(num).padStart(2, '0')}`;
}

function MapaContent() {
  const searchParams = useSearchParams();
  const initialVendorId = searchParams.get('vendorId');
  const initialBooth = searchParams.get('booth');

  const { currentUser } = useUser();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [hoveredBoothId, setHoveredBoothId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    async function loadData() {
      try {
        const [vRes, oRes] = await Promise.all([
          fetch('/api/vendors?includeAll=true'),
          fetch('/api/orders'),
        ]);

        let vData: Vendor[] = [];
        if (vRes.ok) {
          vData = await vRes.json();
          setVendors(vData);
        }

        if (oRes.ok) {
          const oData: Order[] = await oRes.json();
          setOrders(oData);
        }

        // Handle URL parameters for direct deep-linking
        if (initialBooth) {
          setSelectedBoothId(normalizeBoothId(initialBooth));
        } else if (initialVendorId && vData.length > 0) {
          const target = vData.find(v => v.id === initialVendorId || v.slug === initialVendorId);
          if (target?.boothNumber) {
            setSelectedBoothId(normalizeBoothId(target.boothNumber));
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do mapa:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [initialVendorId, initialBooth]);

  // Find orders belonging to the logged in client that are READY for pickup (PRONTO)
  const clientReadyOrdersByVendor = useMemo(() => {
    const map = new Map<string, Order[]>();
    const clientId = currentUser?.id || 'user-client-1'; // fallback to demo client

    orders.forEach(order => {
      const isClientOrder = order.clientId === clientId || (currentUser && order.clientEmail === currentUser.email);
      if (isClientOrder && order.status?.toUpperCase() === 'PRONTO') {
        const list = map.get(order.vendorId) || [];
        list.push(order);
        map.set(order.vendorId, list);
      }
    });

    return map;
  }, [orders, currentUser]);

  // Match vendors to layout booth spots
  const boothsWithVendors = useMemo(() => {
    const assignedMap = new Map<string, { spot: BoothLayoutSpot; vendor?: Vendor; hasReadyOrder: boolean }>();

    // 1. Initialize all predefined spots
    BOOTH_SPOTS.forEach(spot => {
      assignedMap.set(spot.id, { spot, hasReadyOrder: false });
    });

    // 2. Map existing active vendors by boothNumber
    vendors.filter(v => v.active).forEach(v => {
      const normalizedId = normalizeBoothId(v.boothNumber);
      const readyOrders = clientReadyOrdersByVendor.get(v.id) || [];
      const hasReadyOrder = readyOrders.length > 0;

      if (assignedMap.has(normalizedId)) {
        const item = assignedMap.get(normalizedId)!;
        item.vendor = v;
        item.hasReadyOrder = hasReadyOrder;
      } else {
        // If boothNumber is outside standard 32, find first empty spot in matching sector
        const emptySpot = BOOTH_SPOTS.find(s => !assignedMap.get(s.id)?.vendor);
        if (emptySpot) {
          const item = assignedMap.get(emptySpot.id)!;
          item.vendor = v;
          item.hasReadyOrder = hasReadyOrder;
        }
      }
    });

    return Array.from(assignedMap.values());
  }, [vendors, clientReadyOrdersByVendor]);

  // Currently selected vendor & spot
  const selectedItem = useMemo(() => {
    if (!selectedBoothId) return null;
    return boothsWithVendors.find(b => b.spot.id === selectedBoothId) || null;
  }, [selectedBoothId, boothsWithVendors]);

  // Ready orders count for user banner
  const totalReadyOrdersCount = useMemo(() => {
    let count = 0;
    clientReadyOrdersByVendor.forEach(list => {
      count += list.length;
    });
    return count;
  }, [clientReadyOrdersByVendor]);

  const categories = ['Todos', 'Hortifrúti', 'Doces & Panificação', 'Queijos & Laticínios', 'Pastéis & Salgados', 'Temperos & Ervas'];

  const filteredBooths = useMemo(() => {
    return boothsWithVendors.filter(item => {
      const vendor = item.vendor;
      const category = vendor?.category || item.spot.categoryDefault;

      const matchCategory = selectedCategory === 'Todos' || category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchSearch = !searchQuery || 
        item.spot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor?.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.spot.sectorName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCategory && matchSearch;
    });
  }, [boothsWithVendors, selectedCategory, searchQuery]);

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Header Banner */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-feira-800 to-stone-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-emerald-200">
            <Compass className="w-3.5 h-3.5" />
            <span>Praça da Matriz • Feira Livre Central</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Mapa Interativo das Barracas
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Localize os pontos de atendimento numerados (<span className="font-mono font-bold text-amber-300">B-01 a B-32</span>) para retirar seus pré-pedidos sem filas ou planejar seu roteiro de compras.
          </p>
        </div>

        {/* Ready orders badge if any */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {totalReadyOrdersCount > 0 ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/30 border border-emerald-400/50 backdrop-blur-md flex items-center gap-3 text-xs animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-emerald-400 text-stone-950 flex items-center justify-center font-bold">
                🧺
              </div>
              <div>
                <div className="font-extrabold text-emerald-200">
                  {totalReadyOrdersCount} {totalReadyOrdersCount === 1 ? 'pedido pronto' : 'pedidos prontos'} para retirada!
                </div>
                <div className="text-[11px] text-stone-300">
                  Barracas destacadas em verde no mapa
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-xs text-stone-300">
              💡 <strong>Dica:</strong> Clique em qualquer barraca para ver detalhes e produtos
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="w-full bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Search input */}
        <div className="relative w-full lg:w-72 xl:w-80 shrink-0">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por barraca (ex: B-14, Zé)..."
            className="w-full pl-10 pr-8 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-feira-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Categories scrollable pill bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-stone-200 flex-1 min-w-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.7, Number((prev - 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-700 transition cursor-pointer"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold text-stone-600 px-1.5 min-w-[42px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.5, Number((prev + 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-700 transition cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => { setZoomLevel(1); setSelectedBoothId(null); setSelectedCategory('Todos'); setSearchQuery(''); }}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer"
            title="Resetar visualização"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Reset</span>
          </button>
        </div>
      </div>

      {/* Main Map + Side Details Layout */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SVG Interactive Canvas (Takes 8 columns when details open, or all 12 columns) */}
        <div className={`w-full col-span-1 ${selectedItem ? 'lg:col-span-8' : 'lg:col-span-12'} bg-stone-100/90 border border-stone-300 rounded-3xl p-3 sm:p-6 shadow-inner overflow-hidden relative transition-all`}>
          
          {/* Legend Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-semibold text-stone-600 mb-4 bg-white/90 backdrop-blur-xs p-3 rounded-2xl border border-stone-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shadow-xs" /> Hortifrúti
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block shadow-xs" /> Doces & Pães
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 inline-block shadow-xs" /> Queijos & Laticínios
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block shadow-xs" /> Pastéis & Gastronomia
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-900 font-bold bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full animate-pulse">
                🧺 Pedido Pronto
              </span>
              <span className="flex items-center gap-1.5 text-stone-400">
                <span className="w-2.5 h-2.5 rounded-full border border-stone-400 inline-block" /> Ponto Livre
              </span>
            </div>
          </div>

          {/* Mobile swipe helper hint */}
          <div className="lg:hidden flex items-center justify-between text-[11px] text-stone-500 font-medium px-1 pb-2">
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-stone-400" />
              Arraste para os lados para navegar pela praça
            </span>
            <span className="text-[10px] bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded-full font-bold">
              32 Barracas
            </span>
          </div>

          {/* Scalable Vector Graphics of Praça da Matriz */}
          <div className="w-full overflow-x-auto overflow-y-hidden pb-2 scrollbar-thin scrollbar-thumb-stone-300 flex justify-center">
            <div 
              style={{ 
                width: zoomLevel === 1 ? '100%' : `${Math.round(zoomLevel * 100)}%`,
                minWidth: zoomLevel > 1 ? `${Math.round(zoomLevel * 850)}px` : undefined,
                transition: 'width 0.2s ease-out'
              }}
              className="w-full min-w-[650px] lg:min-w-0 aspect-[1000/640] select-none mx-auto"
            >
              <svg 
                viewBox="0 0 1000 640" 
                className="w-full h-full drop-shadow-md rounded-2xl block"
                style={{ background: '#f5f5f4' }}
              >
                <defs>
                  {/* Decorative Patterns */}
                  <pattern id="cobblestone" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 0 10 L 20 10 M 10 0 L 10 20" stroke="#e7e5e4" strokeWidth="1.5" fill="none" />
                  </pattern>

                  {/* Shading filter */}
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.15" />
                  </filter>

                  <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#10b981" floodOpacity="0.8" />
                  </filter>

                  <filter id="glow-selected" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.9" />
                  </filter>
                </defs>

                {/* Outer Park Border / Grass Lawn */}
                <rect x="20" y="20" width="960" height="600" rx="30" fill="#e7eedd" stroke="#d5e3c7" strokeWidth="6" />

                {/* Central Cobblestone Pedestrian Plaza */}
                <rect x="180" y="90" width="640" height="460" rx="24" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="3" />
                <rect x="180" y="90" width="640" height="460" rx="24" fill="url(#cobblestone)" opacity="0.6" />

                {/* Diagonal & Cross Walkways */}
                <line x1="20" y1="320" x2="980" y2="320" stroke="#f1f5f9" strokeWidth="26" strokeDasharray="10 4" />
                <line x1="500" y1="20" x2="500" y2="620" stroke="#f1f5f9" strokeWidth="26" strokeDasharray="10 4" />

                {/* Entrance Gates */}
                <g className="text-[10px] font-bold fill-stone-500 uppercase tracking-widest text-center">
                  <rect x="420" y="22" width="160" height="24" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                  <text x="500" y="38" textAnchor="middle">Entrada Norte • Matriz</text>

                  <rect x="420" y="594" width="160" height="24" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                  <text x="500" y="610" textAnchor="middle">Entrada Sul • Av. Central</text>

                  <rect x="24" y="308" width="110" height="24" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                  <text x="79" y="324" textAnchor="middle">Entrada Oeste</text>

                  <rect x="866" y="308" width="110" height="24" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                  <text x="921" y="324" textAnchor="middle">Entrada Leste</text>
                </g>

                {/* Decorative Trees in Park Gardens */}
                <g fill="#86efac" stroke="#4ade80" strokeWidth="3" opacity="0.9">
                  <circle cx="80" cy="80" r="32" />
                  <circle cx="920" cy="80" r="32" />
                  <circle cx="80" cy="560" r="32" />
                  <circle cx="920" cy="560" r="32" />
                  <circle cx="500" cy="230" r="22" />
                  <circle cx="500" cy="410" r="22" />
                  <circle cx="330" cy="320" r="20" />
                  <circle cx="670" cy="320" r="20" />
                </g>

                {/* Center Attraction: Coreto Histórico / Chafariz */}
                <g filter="url(#shadow)">
                  {/* Outer circle coreto */}
                  <circle cx="500" cy="320" r="60" fill="#fef08a" stroke="#ca8a04" strokeWidth="4" />
                  <circle cx="500" cy="320" r="48" fill="#fefce8" stroke="#eab308" strokeWidth="2" />
                  {/* Gazebo Roof icon */}
                  <polygon points="500,285 535,320 465,320" fill="#ca8a04" />
                  <rect x="475" y="320" width="50" height="26" fill="#fef9c3" stroke="#a16207" strokeWidth="1.5" />
                  <text x="500" y="358" textAnchor="middle" fill="#713f12" fontSize="9" fontWeight="900" letterSpacing="0.5">
                    CORETO CENTRAL
                  </text>
                  <text x="500" y="369" textAnchor="middle" fill="#a16207" fontSize="7" fontWeight="bold">
                    Área de Descanso & Música
                  </text>
                </g>

                {/* Sector Titles on SVG Path */}
                <g fontSize="10" fontWeight="900" fill="#64748b" letterSpacing="1" opacity="0.75">
                  <text x="500" y="95" textAnchor="middle">◄ ALAMEDA NORTE: HORTALICAS & FRUTAS ORGANICAS ►</text>
                  <text x="500" y="555" textAnchor="middle">◄ ALAMEDA SUL: DOCES, PAES ARTESANAIS & COMPOTAS ►</text>
                  <text x="895" y="175" textAnchor="middle">QUEIJARIAS</text>
                  <text x="105" y="175" textAnchor="middle">GASTRONOMIA</text>
                </g>

                {/* Render All 32 Booths */}
                {BOOTH_SPOTS.map(spot => {
                  const boothData = boothsWithVendors.find(b => b.spot.id === spot.id);
                  const vendor = boothData?.vendor;
                  const hasReadyOrder = Boolean(boothData?.hasReadyOrder);
                  const isSelected = selectedBoothId === spot.id;
                  const isHovered = hoveredBoothId === spot.id;

                  const categoryName = vendor?.category || spot.categoryDefault;
                  const colors = CATEGORY_COLORS[categoryName] || CATEGORY_COLORS['Outros'];

                  const isOccupied = Boolean(vendor);

                  return (
                    <g 
                      key={spot.id} 
                      className="cursor-pointer transition-transform duration-150"
                      onClick={() => setSelectedBoothId(spot.id)}
                      onMouseEnter={() => setHoveredBoothId(spot.id)}
                      onMouseLeave={() => setHoveredBoothId(null)}
                      filter={hasReadyOrder ? 'url(#glow-green)' : isSelected ? 'url(#glow-selected)' : 'url(#shadow)'}
                    >
                      {/* Pulsing Aura if Ready Order */}
                      {hasReadyOrder && (
                        <circle 
                          cx={spot.x} 
                          cy={spot.y} 
                          r={isSelected ? 36 : 30} 
                          fill="#10b981" 
                          opacity="0.3" 
                          className="animate-ping"
                        />
                      )}

                      {/* Booth Tent Canopy / Base Box */}
                      <rect
                        x={spot.x - 26}
                        y={spot.y - 20}
                        width="52"
                        height="40"
                        rx="8"
                        fill={isOccupied ? colors.tentColor : '#e2e8f0'}
                        stroke={isSelected ? '#f59e0b' : hasReadyOrder ? '#059669' : isOccupied ? colors.border.replace('border-', '') : '#cbd5e1'}
                        strokeWidth={isSelected ? 3.5 : hasReadyOrder ? 3 : 1.5}
                      />

                      {/* Striped Awning Eaves */}
                      <path
                        d={`M ${spot.x - 26} ${spot.y - 6} Q ${spot.x - 13} ${spot.y} ${spot.x} ${spot.y - 6} Q ${spot.x + 13} ${spot.y} ${spot.x + 26} ${spot.y - 6}`}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        opacity="0.7"
                      />

                      {/* Booth Code Label (e.g. B-14) */}
                      <text
                        x={spot.x}
                        y={spot.y - 7}
                        textAnchor="middle"
                        fill={isOccupied ? '#ffffff' : '#64748b'}
                        fontSize="9"
                        fontWeight="900"
                      >
                        {spot.id}
                      </text>

                      {/* Content inside booth (Vendor initials or free icon) */}
                      {isOccupied ? (
                        <text
                          x={spot.x}
                          y={spot.y + 11}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="8"
                          fontWeight="700"
                          className="truncate"
                        >
                          {vendor!.businessName.slice(0, 7)}..
                        </text>
                      ) : (
                        <text
                          x={spot.x}
                          y={spot.y + 10}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="7"
                          fontWeight="bold"
                        >
                          Livre
                        </text>
                      )}

                      {/* Ready Order Pin Indicator */}
                      {hasReadyOrder && (
                        <g transform={`translate(${spot.x + 16}, ${spot.y - 20})`}>
                          <circle cx="0" cy="0" r="8" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                          <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">✓</text>
                        </g>
                      )}

                      {/* Selected Marker Arrow */}
                      {isSelected && (
                        <polygon
                          points={`${spot.x},${spot.y - 28} ${spot.x - 6},${spot.y - 36} ${spot.x + 6},${spot.y - 36}`}
                          fill="#f59e0b"
                        />
                      )}

                      {/* Hover Tooltip Floating Title */}
                      {(isHovered || isSelected) && (
                        <g transform={`translate(${spot.x}, ${spot.y - 38})`}>
                          <rect
                            x="-65"
                            y="-16"
                            width="130"
                            height="18"
                            rx="6"
                            fill="#0f172a"
                            opacity="0.92"
                          />
                          <text
                            x="0"
                            y="-4"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                          >
                            {vendor ? `${spot.id} • ${vendor.businessName.slice(0, 18)}` : `${spot.id} • Ponto Disponível`}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="mt-2 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
            <Info className="w-3.5 h-3.5 text-stone-400" />
            <span>Dica de navegação: use os botões de zoom ou clique nas barracas para inspecionar</span>
          </div>
        </div>

        {/* Side Panel: Selected Booth & Vendor Details */}
        {selectedItem && (
          <div className="w-full col-span-1 lg:col-span-4 bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150 lg:sticky lg:top-24">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-amber-500 text-stone-950 font-black text-xs">
                  PONTO {selectedItem.spot.id}
                </span>
                <span className="text-xs text-stone-500 font-medium truncate max-w-[140px]">
                  {selectedItem.spot.sectorName}
                </span>
              </div>
              <button
                onClick={() => setSelectedBoothId(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                title="Fechar detalhes"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedItem.vendor ? (
              <div className="space-y-4">
                {/* Vendor Cover & Avatar */}
                <div className="relative rounded-2xl overflow-hidden h-28 bg-stone-100">
                  {selectedItem.vendor.coverImage ? (
                    <img 
                      src={selectedItem.vendor.coverImage} 
                      alt={selectedItem.vendor.businessName} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-feira-700 to-emerald-800 flex items-center justify-center text-white/50">
                      <Store className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-transparent" />
                  
                  <div className="absolute bottom-3 left-3 flex items-center gap-2.5">
                    {selectedItem.vendor.avatar && (
                      <img 
                        src={selectedItem.vendor.avatar} 
                        alt="Avatar" 
                        className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm"
                      />
                    )}
                    <div>
                      <h3 className="font-extrabold text-white text-base leading-tight drop-shadow-xs">
                        {selectedItem.vendor.businessName}
                      </h3>
                      <span className="text-[11px] text-amber-300 font-semibold">
                        {selectedItem.vendor.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating & Pro Badge */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-stone-700 font-bold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span>{selectedItem.vendor.rating.toFixed(1)}</span>
                    <span className="text-stone-400 font-normal">({selectedItem.vendor.ratingCount} avaliações)</span>
                  </div>

                  {(selectedItem.vendor.isSubscriber || selectedItem.vendor.plan === 'PRO') && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      ⭐ Parceiro Pro
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-stone-600 leading-relaxed">
                  {selectedItem.vendor.description}
                </p>

                {/* Fair Location & Pickup details */}
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-stone-700 font-medium">
                    <MapPin className="w-4 h-4 text-feira-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Ponto Físico na Feira:</strong>
                      <div className="text-stone-500 text-[11px]">
                        {selectedItem.vendor.fairLocation || `Praça da Matriz - Barraca ${selectedItem.spot.id}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-stone-700 font-medium pt-1 border-t border-stone-200/60">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Horário da Feira:</strong>
                      <div className="text-stone-500 text-[11px]">
                        Sábados das 07:00 às 12:30
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alert if client has READY orders for this vendor */}
                {selectedItem.hasReadyOrder && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-1.5 animate-pulse">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Você tem pedido pronto nesta barraca!</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Passe no ponto {selectedItem.spot.id} para retirar seus produtos sem fila.
                    </p>
                    <Link
                      href="/pedidos"
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline pt-0.5"
                    >
                      <span>Abrir comprovante de retirada em Meus Pedidos</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <Link
                    href={`/feirantes/${selectedItem.vendor.slug || selectedItem.vendor.id}`}
                    className="w-full py-3 px-4 rounded-xl bg-feira-600 hover:bg-feira-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Ver Catálogo Completo da Barraca</span>
                  </Link>

                  <a
                    href={getVendorContactLink(selectedItem.vendor.whatsappPhone || '87998018279', selectedItem.vendor.businessName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Falar no WhatsApp do Feirante</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3 text-stone-500">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <Store className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-stone-800">Ponto Disponível ({selectedItem.spot.id})</h4>
                <p className="text-xs max-w-xs mx-auto">
                  Este espaço no setor de <strong>{selectedItem.spot.categoryDefault}</strong> está disponível para cadastro de novos feirantes na feira física.
                </p>
                <Link
                  href="/"
                  className="inline-block text-xs text-feira-700 font-bold hover:underline pt-2"
                >
                  Ver feirantes já cadastrados
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overview Grid of Registered Booths in Fair */}
      <div className="w-full bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-stone-900 text-lg">Diretório de Barracas da Praça da Matriz</h3>
            <p className="text-xs text-stone-500">
              {filteredBooths.filter(b => b.vendor).length} barracas ativas cadastradas no mapa da feira
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBooths
            .filter(b => b.vendor)
            .map(({ spot, vendor, hasReadyOrder }) => {
              const isSelected = selectedBoothId === spot.id;
              return (
                <div
                  key={spot.id}
                  onClick={() => setSelectedBoothId(spot.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    hasReadyOrder
                      ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/40 shadow-xs'
                      : isSelected
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
                      : 'bg-stone-50/60 hover:bg-stone-100/70 border-stone-200/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg bg-stone-900 text-white font-black text-[10px]">
                        {spot.id}
                      </span>
                      {hasReadyOrder ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                          ✓ Pronto
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-stone-400">
                          {spot.sectorName}
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-sm text-stone-900 pt-1">
                      {vendor?.businessName}
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      {vendor?.category}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs font-semibold text-feira-700">
                    <span>Localizar no mapa</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

    </div>
  );
}

export default function MapaPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-stone-400 animate-pulse">
        Carregando mapa interativo da feira...
      </div>
    }>
      <MapaContent />
    </Suspense>
  );
}
