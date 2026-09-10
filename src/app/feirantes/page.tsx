'use client';

import React, { useState, useEffect } from 'react';
import { Store, Search, MapPin, Leaf } from 'lucide-react';
import { Vendor } from '@/types';
import { VendorCard } from '@/components/VendorCard';
import { useFair } from '@/lib/fair-context';

export default function FeirantesListPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [onlyOrganic, setOnlyOrganic] = useState(false);
  const [loading, setLoading] = useState(true);
  const { selectedFairId, selectedFair, fairs, setSelectedFairId } = useFair();

  useEffect(() => {
    async function loadVendors() {
      try {
        const res = await fetch('/api/vendors');
        if (res.ok) setVendors(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadVendors();
  }, []);

  const filtered = vendors.filter(v => {
    if (onlyOrganic && !(v.isCertifiedOrganic && v.certStatus === 'APPROVED')) {
      return false;
    }

    // Filter by selected fair if one is active
    if (selectedFairId !== 'ALL' && selectedFair) {
      const matchesFairRelation = v.fairLocations?.some(
        vf => (vf.fairLocationId === selectedFair.id || vf.fairLocationId === selectedFair.slug) && vf.active
      );
      if (!matchesFairRelation) {
        const locLower = (v.fairLocation || '').toLowerCase();
        const matchesText = 
          (selectedFair.id === 'fair-1' && (locLower.includes('matriz') || locLower.includes('centro'))) ||
          (selectedFair.id === 'fair-2' && locLower.includes('bairro novo')) ||
          (selectedFair.id === 'fair-3' && (locLower.includes('parque') || locLower.includes('agroecol')));
        if (!matchesText) return false;
      }
    }

    const matchesSearch = 
      !search ||
      v.businessName.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()) ||
      (v.fairLocation || '').toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">Barracas & Feirantes</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {selectedFair
              ? `Exibindo feirantes da ${selectedFair.name} (${Array.isArray(selectedFair.operatingDays) ? selectedFair.operatingDays.join(', ') : selectedFair.operatingDays})`
              : 'Conheça todos os produtores das feiras da região e reserve direto com eles.'}
          </p>
        </div>

        {/* Quick Fair Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedFairId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedFairId === 'ALL'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            Todas as Feiras
          </button>
          {fairs.map(fair => (
            <button
              key={fair.id}
              onClick={() => setSelectedFairId(fair.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition ${
                selectedFairId === fair.id
                  ? 'bg-feira-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>{fair.name.replace('Feira Livre ', '').replace('Feira da ', '')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="max-w-md w-full bg-white p-2 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-stone-400 ml-2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por feirante, categoria ou local..."
            className="w-full text-xs bg-transparent focus:outline-none text-stone-800 py-1.5"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-stone-400 hover:text-stone-600 mr-2 cursor-pointer">
              Limpar
            </button>
          )}
        </div>

        {/* Filter Pill: Somente Orgânicos Certificados (US27) */}
        <button
          onClick={() => setOnlyOrganic(!onlyOrganic)}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs border shrink-0 ${
            onlyOrganic
              ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300 shadow-emerald-500/20'
              : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
          }`}
        >
          <Leaf className={`w-3.5 h-3.5 ${onlyOrganic ? 'text-white fill-white' : 'text-emerald-600'}`} />
          <span>🌿 Apenas Produtores Certificados</span>
          {onlyOrganic && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 bg-white rounded-2xl animate-pulse border border-stone-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 max-w-lg mx-auto">
          <Store className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Nenhum feirante encontrado</h3>
          <p className="text-xs text-stone-500 mt-1">
            Nenhum feirante corresponde aos filtros selecionados nesta feira.
          </p>
          <button
            onClick={() => {
              setSelectedFairId('ALL');
              setSearch('');
              setOnlyOrganic(false);
            }}
            className="mt-4 px-4 py-2 bg-feira-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Ver feirantes de todas as praças
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(vendor => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
}
