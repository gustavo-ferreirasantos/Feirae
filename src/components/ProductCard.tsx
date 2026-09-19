'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Minus, Check, Leaf, AlertCircle, Store, ShieldAlert, Scale } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency, formatWeight, DEFAULT_PRODUCT_IMAGE } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';
import { useUser } from '@/lib/user-context';

export function ProductCard({ 
  product, 
  vendorIsCertifiedOrganic 
}: { 
  product: Product; 
  vendorIsCertifiedOrganic?: boolean; 
}) {
  const { addItem, setItemQuantity, items } = useCart();
  const { currentUser } = useUser();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isVendor = currentUser?.role === 'VENDOR';
  const [feedback, setFeedback] = useState<string | null>(null);

  const cartItem = items.find(i => i.product.id === product.id);
  const inCartQty = cartItem?.quantity || 0;
  const isOutOfStock = product.stock <= 0;

  // Weight state for weighable products
  const defaultInitialWeight = Math.min(0.5, product.stock > 0 ? product.stock : 0.5);
  const [selectedWeight, setSelectedWeight] = useState<number>(defaultInitialWeight);
  const currentWeight = inCartQty > 0 ? inCartQty : selectedWeight;

  const handleWeightChange = (newWeight: number) => {
    const cleanWeight = Number(newWeight.toFixed(3));
    setSelectedWeight(cleanWeight);
    if (inCartQty > 0) {
      const res = setItemQuantity(product, cleanWeight);
      if (!res.success && res.message) {
        setFeedback(res.message);
        setTimeout(() => setFeedback(null), 3500);
      } else {
        setFeedback(`Carrinho atualizado: ${formatWeight(cleanWeight)}`);
        setTimeout(() => setFeedback(null), 1500);
      }
    }
  };

  const handleWeighableSubmit = () => {
    if (isAdmin) {
      setFeedback('Administradores não realizam compras de pré-pedidos.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    if (isVendor) {
      setFeedback('Feirantes não realizam compras/reservas de produtos.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    if (isOutOfStock) return;

    const res = setItemQuantity(product, currentWeight);
    if (!res.success && res.message) {
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback(`Reservado: ${formatWeight(currentWeight)}!`);
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const handleAdd = () => {
    if (isAdmin) {
      setFeedback('Administradores não realizam compras de pré-pedidos.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    if (isVendor) {
      setFeedback('Feirantes não realizam compras/reservas de produtos.');
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
        <img
          src={product.imageUrl?.trim() ? product.imageUrl.trim() : DEFAULT_PRODUCT_IMAGE}
          alt={product.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Category, Organic & Weighable Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {product.isOrganic && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
              vendorIsCertifiedOrganic
                ? 'bg-emerald-700 text-white border border-emerald-400/40'
                : 'bg-emerald-600 text-white'
            }`}>
              <Leaf className="w-3 h-3" />
              {vendorIsCertifiedOrganic ? '🌿 Orgânico Certificado' : 'Orgânico'}
            </span>
          )}
          {product.isWeighable && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-xs">
              <Scale className="w-3 h-3" /> Por Peso
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
              Últimos {product.isWeighable ? formatWeight(product.stock) : `${product.stock} ${product.unit}s`}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/90 text-stone-700 backdrop-blur-xs">
              {product.isWeighable ? `${formatWeight(product.stock)} disp.` : `${product.stock} ${product.unit}s disp.`}
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

        {/* Weighable vs Standard Selection & Price */}
        {product.isWeighable ? (
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                  <Scale className="w-2.5 h-2.5" /> Vendido por peso
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-sm font-extrabold text-stone-900">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">
                    /{product.unit}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 block">Estimativa:</span>
                <span className="text-sm font-black text-feira-700">
                  {formatCurrency(Math.round((product.price * currentWeight) * 100) / 100)}
                </span>
              </div>
            </div>

            {/* Quick Fraction Presets */}
            <div className="flex items-center gap-1">
              {[0.25, 0.5, 0.75, 1.0].map(w => {
                const isSelected = Math.abs(currentWeight - w) < 0.01;
                const isOverStock = w > product.stock;
                return (
                  <button
                    key={w}
                    type="button"
                    disabled={isOutOfStock || isOverStock || isAdmin || isVendor}
                    onClick={() => handleWeightChange(w)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {formatWeight(w)}
                  </button>
                );
              })}
            </div>

            {/* Stepper with ±100g and Reservation Button */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 p-0.5 shrink-0">
                <button
                  type="button"
                  disabled={isOutOfStock || currentWeight <= 0.1 || isAdmin || isVendor}
                  onClick={() => handleWeightChange(Math.max(0.1, Number((currentWeight - 0.1).toFixed(3))))}
                  className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition disabled:opacity-30 cursor-pointer"
                  title="Diminuir 100g"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-1.5 text-[11px] font-extrabold text-stone-900 min-w-[38px] text-center">
                  {formatWeight(currentWeight)}
                </span>
                <button
                  type="button"
                  disabled={isOutOfStock || currentWeight >= product.stock || isAdmin || isVendor}
                  onClick={() => handleWeightChange(Math.min(product.stock, Number((currentWeight + 0.1).toFixed(3))))}
                  className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition disabled:opacity-30 cursor-pointer"
                  title="Aumentar 100g"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleWeighableSubmit}
                disabled={isOutOfStock || isAdmin || isVendor}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition ${
                  isAdmin || isVendor
                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                    : isOutOfStock
                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    : inCartQty > 0
                    ? inCartQty === currentWeight
                      ? 'bg-feira-600 text-white hover:bg-feira-700 shadow-xs'
                      : 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
                    : 'bg-stone-900 text-white hover:bg-feira-600 shadow-xs'
                }`}
              >
                {isAdmin ? (
                  <span>Admin</span>
                ) : isVendor ? (
                  <span>Feirante</span>
                ) : inCartQty > 0 ? (
                  inCartQty === currentWeight ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{formatWeight(inCartQty)} no carrinho</span>
                    </>
                  ) : (
                    <span>Mudar para {formatWeight(currentWeight)}</span>
                  )
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Reservar {formatWeight(currentWeight)}</span>
                  </>
                )}
              </button>
            </div>

            <span className="text-[10px] text-amber-700 block text-center font-medium">
              *Pesagem final aferida na balança na retirada
            </span>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-400 block font-normal">
                Preço demonstrativo
              </span>
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
              disabled={isOutOfStock || isAdmin || isVendor}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                isAdmin || isVendor
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                  : isOutOfStock
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  : inCartQty > 0
                  ? 'bg-feira-600 text-white hover:bg-feira-700 shadow-xs'
                  : 'bg-stone-900 text-white hover:bg-feira-600 shadow-xs'
              }`}
              title={
                isAdmin
                  ? 'Administradores não realizam compras de pré-pedidos'
                  : isVendor
                  ? 'Feirantes não realizam compras de pré-pedidos'
                  : undefined
              }
            >
              {isAdmin ? (
                <span>Modo Admin</span>
              ) : isVendor ? (
                <span>Modo Feirante</span>
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
        )}

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
