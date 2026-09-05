'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check, Store, Calendar, Clock, X } from 'lucide-react';
import { useFair } from '@/lib/fair-context';

export function FairSelector() {
  const { fairs, selectedFairId, selectedFair, setSelectedFairId } = useFair();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedFairId(id);
    setIsOpen(false);
  };

  const displayName = selectedFair 
    ? `${selectedFair.name} (${selectedFair.operatingDays})`
    : 'Todas as Feiras da Região';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/90 hover:bg-stone-200/80 text-stone-800 text-xs font-bold transition border border-stone-200 shadow-2xs cursor-pointer max-w-[220px] sm:max-w-[280px]"
        title="Clique para escolher a feira da sua preferência"
      >
        <MapPin className="w-3.5 h-3.5 text-feira-600 shrink-0" />
        <span className="truncate">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0 ml-auto`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-stone-200 z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-1.5 text-stone-900 font-extrabold text-sm">
              <MapPin className="w-4 h-4 text-feira-600" />
              <span>Escolha sua Feira / Região</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-stone-500">
            Selecione em qual praça ou bairro você vai retirar seus produtos frescos:
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {/* Option: Todas as Feiras */}
            <button
              type="button"
              onClick={() => handleSelect('ALL')}
              className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                selectedFairId === 'ALL'
                  ? 'bg-feira-50 border-feira-300 text-feira-900 shadow-xs'
                  : 'bg-stone-50/70 border-stone-200/70 text-stone-700 hover:bg-stone-100/70'
              }`}
            >
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-stone-600" />
                  Todas as Feiras da Região
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  Exibir produtores e ofertas de todas as praças cadastradas
                </div>
              </div>
              {selectedFairId === 'ALL' && (
                <Check className="w-4 h-4 text-feira-600 shrink-0 ml-2" />
              )}
            </button>

            {/* Individual Fairs */}
            {fairs.map(fair => {
              const isSelected = selectedFairId === fair.id || selectedFairId === fair.slug;

              return (
                <button
                  key={fair.id}
                  type="button"
                  onClick={() => handleSelect(fair.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition flex items-start justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                      : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-xs flex items-center gap-1.5 text-stone-900">
                      <span>{fair.name}</span>
                    </div>

                    <div className="text-[10px] text-stone-500">
                      {fair.address}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-900 flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {fair.operatingDays}
                      </span>
                      <span className="text-[9px] text-stone-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {fair.schedule}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
