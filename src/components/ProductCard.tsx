'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Check, Leaf, AlertCircle, Store, ShieldAlert } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';
import { useUser } from '@/lib/user-context';

export function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const { currentUser } = useUser();
  const [feedback, setFeedback] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';
  const cartItem = items.find(i => i.product.id === product.id);
  const inCartQty = cartItem?.quantity || 0;
  const isOutOfStock = product.stock <= 0;

  const handleAdd = () => {
    if (isAdmin) {
      setFeedback('Administradores não realizam compras de pré-pedidos.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    if (isOutOfStock) return;
    const res = addItem(product, 1);
    if (!res.success && res.message) {
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback('Adicionado!');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-stone-200/90 hover:border-feira-400/80 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden relative">
      
      {/* Product Image */}
      <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100">
            <Store className="w-10 h-10 stroke-1" />
          </div>
        )}

        {/* Category & Organic Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {product.isOrganic && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
              <Leaf className="w-3 h-3" /> Orgânico
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-900/70 text-white backdrop-blur-xs">
            {product.category}
          </span>
        </div>

        {/* Stock Badge */}
        <div className="absolute bottom-2.5 right-2.5">
          {isOutOfStock ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white">
              Esgotado
            </span>
          ) : product.stock <= 5 ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white">
              Últimas {product.stock} {product.unit}s
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/90 text-stone-700 backdrop-blur-xs">
              {product.stock} {product.unit}s disp.
            </span>
          )}
        </div>
      </div>

      {/* Info Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {product.vendorName && (
            <Link
              href={`/feirantes/${product.vendorId}`}
              className="text-[11px] font-semibold text-feira-700 hover:underline flex items-center gap-1 mb-1 truncate"
            >
              <Store className="w-3 h-3" />
              {product.vendorName}
            </Link>
          )}
          <h3 className="font-bold text-stone-900 text-sm leading-snug line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Action Button */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400 block font-normal">Preço demonstrativo</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-extrabold text-stone-900">
                {formatCurrency(product.price)}
              </span>
              <span className="text-xs text-stone-500 font-medium">
                /{product.unit}
              </span>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={isOutOfStock || isAdmin}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              isAdmin
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                : isOutOfStock
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                : inCartQty > 0
                ? 'bg-feira-600 text-white hover:bg-feira-700 shadow-xs'
                : 'bg-stone-900 text-white hover:bg-feira-600 shadow-xs'
            }`}
            title={isAdmin ? 'Administradores não realizam compras de pré-pedidos' : undefined}
          >
            {isAdmin ? (
              <span>Modo Admin</span>
            ) : inCartQty > 0 ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{inCartQty} no carrinho</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Reservar</span>
              </>
            )}
          </button>
        </div>

        {/* Feedback Alert Toast Inline */}
        {feedback && (
          <div className="mt-2 p-1.5 rounded-lg bg-stone-900 text-white text-[11px] text-center animate-in fade-in duration-150">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}
