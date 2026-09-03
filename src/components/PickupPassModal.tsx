'use client';

import React from 'react';
import { 
  QrCode, 
  X, 
  Store, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  User,
  ShieldCheck
} from 'lucide-react';
import { Order } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PickupPassModalProps {
  order: Order;
  onClose: () => void;
}

export function PickupPassModal({ order, onClose }: PickupPassModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Pass */}
        <div className="p-5 bg-gradient-to-r from-feira-700 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
              FL
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Pass de Retirada</h3>
              <p className="text-[10px] text-white/80">Apresente na barraca do feirante</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pass Content */}
        <div className="p-6 text-center space-y-4">
          
          {/* Order Number Big Display */}
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Código do Pré-pedido
            </span>
            <span className="text-2xl font-black text-stone-900 tracking-tight font-mono">
              #{order.orderNumber}
            </span>
          </div>

          {/* Simulated QR Code Box */}
          <div className="p-4 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 inline-block mx-auto shadow-inner">
            <div className="w-44 h-44 bg-white p-3 border border-stone-200 rounded-xl shadow-xs flex flex-col items-center justify-center relative">
              <QrCode className="w-36 h-36 text-stone-900" />
              <span className="text-[9px] font-mono text-stone-400 mt-1">TOKEN: {order.id.slice(0, 12)}</span>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
              order.status === 'PRONTO'
                ? 'bg-emerald-100 text-emerald-800'
                : order.status === 'EM_PREPARO'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {order.status === 'PRONTO' ? 'Pronto para Retirada!' : order.status === 'EM_PREPARO' ? 'Sendo Separado' : 'Aguardando Preparo'}
            </span>
          </div>

          {/* Location and Info */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 text-left text-xs space-y-2">
            <div className="flex items-center gap-2 text-stone-800 font-bold">
              <Store className="w-4 h-4 text-feira-600 shrink-0" />
              <span className="truncate">{order.vendorName || 'Barraca do Feirante'}</span>
            </div>

            <div className="flex items-start gap-2 text-stone-600 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
              <span>{order.pickupLocation}</span>
            </div>

            <div className="flex items-center gap-2 text-stone-600 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{order.pickupDate}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-200/70 text-[11px]">
              <span className="text-stone-500">Total:</span>
              <span className="font-extrabold text-feira-700 text-sm">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          <p className="text-[10px] text-stone-400">
            Mostre esta tela para o feirante na barraca para retirar seus produtos sem fila.
          </p>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition cursor-pointer"
          >
            Fechar Pass
          </button>
        </div>

      </div>
    </div>
  );
}
