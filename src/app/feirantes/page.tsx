'use client';

import React, { useState, useEffect } from 'react';
import { Store, Search } from 'lucide-react';
import { Vendor } from '@/types';
import { VendorCard } from '@/components/VendorCard';

export default function FeirantesListPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  const filtered = vendors.filter(v => 
    v.businessName.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase()) ||
    v.fairLocation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">Barracas & Feirantes</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Conheça os produtores da Feira Livre da Praça da Matriz e reserve direto com eles.
        </p>
      </div>

      <div className="max-w-md bg-white p-2 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-stone-400 ml-2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por feirante, categoria ou local..."
          className="w-full text-xs bg-transparent focus:outline-none text-stone-800 py-1.5"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 bg-white rounded-2xl animate-pulse border border-stone-200" />
          ))}
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
