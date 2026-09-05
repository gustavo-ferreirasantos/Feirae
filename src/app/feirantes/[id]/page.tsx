'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Store, MapPin, Calendar, Clock, Star, MessageSquare, ArrowLeft, AlertCircle, MessageCircle, Award, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Vendor, Product, PickupWindow, Review } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { StarRating } from '@/components/StarRating';
import { formatDate } from '@/lib/utils';
import { getVendorContactLink } from '@/lib/whatsapp';

export default function VendorProfilePage() {
  const params = useParams();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pickupWindows, setPickupWindows] = useState<PickupWindow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'REVIEWS'>('PRODUCTS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVendorData() {
      try {
        const res = await fetch(`/api/vendors/${vendorId}`);
        if (res.ok) {
          const data = await res.json();
          setVendor(data.vendor);
          setProducts(data.products);
          setPickupWindows(data.pickupWindows);
          setReviews(data.reviews);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadVendorData();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-stone-400 animate-pulse">
        Carregando barraca...
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-stone-900">Feirante não encontrado</h2>
        <Link href="/feirantes" className="mt-4 inline-block text-xs font-semibold text-feira-700 underline">
          Voltar para feirantes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <Link
        href="/feirantes"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para todos os feirantes
      </Link>

      {/* Alert when vendor is paused by admin */}
      {vendor.active === false && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-3.5 text-xs shadow-xs animate-in fade-in">
          <div className="w-10 h-10 rounded-2xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-amber-900">Barraca Temporariamente Pausada / Em Análise</div>
            <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
              Esta barraca está pausada pela moderação da administração da feira. Novos pré-pedidos estão temporariamente desabilitados.
            </p>
          </div>
        </div>
      )}

      {/* Vendor Header Hero */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="h-44 sm:h-56 w-full bg-stone-100 relative">
          {vendor.coverImage ? (
            <img src={vendor.coverImage} alt={vendor.businessName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-feira-600 to-feira-800" />
          )}
          {(vendor.isSubscriber || vendor.plan === 'PRO') && (
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-stone-950 shadow-md flex items-center gap-1.5 z-10">
              <Award className="w-4 h-4 text-stone-900" />
              Parceiro Pro
            </span>
          )}
          <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-stone-800 backdrop-blur-xs shadow-xs">
            {vendor.category}
          </span>
        </div>

        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden shrink-0">
                {vendor.avatar ? (
                  <img src={vendor.avatar} alt={vendor.businessName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-feira-100 text-feira-700 flex items-center justify-center">
                    <Store className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                  {vendor.businessName}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <StarRating rating={vendor.rating} count={vendor.ratingCount} showText size="sm" />
                  {vendor.boothNumber && (
                    <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-mono font-bold">
                      {vendor.boothNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200">
                <MapPin className="w-4 h-4 text-feira-600 shrink-0" />
                <span>{vendor.fairLocation}</span>
              </div>

              <a
                href={getVendorContactLink(vendor.whatsappPhone || '87998018279', vendor.businessName)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white/20" />
                <span>Falar no WhatsApp</span>
              </a>
            </div>
          </div>

          <p className="text-sm text-stone-600 leading-relaxed max-w-3xl">
            {vendor.description}
          </p>

          {/* Pickup schedule info */}
          {pickupWindows.length > 0 && (
            <div className="mt-6 pt-6 border-t border-stone-100 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">
                Janelas de Retirada:
              </span>
              {pickupWindows.map(pw => (
                <div key={pw.id} className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{pw.dayOfWeek}: {pw.startTime} às {pw.endTime}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-stone-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`pb-3 transition flex items-center gap-2 ${
            activeTab === 'PRODUCTS'
              ? 'border-b-2 border-feira-600 text-feira-700'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Store className="w-4 h-4" />
          Produtos do Feirante ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('REVIEWS')}
          className={`pb-3 transition flex items-center gap-2 ${
            activeTab === 'REVIEWS'
              ? 'border-b-2 border-feira-600 text-feira-700'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Avaliações de Clientes ({reviews.length})
        </button>
      </div>

      {/* Tab Products */}
      {activeTab === 'PRODUCTS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map(product => (
            <ProductCard 
              key={product.id} 
              product={{ 
                ...product, 
                vendorName: vendor.businessName,
                stock: vendor.active === false ? 0 : product.stock
              }} 
            />
          ))}
        </div>
      )}

      {/* Tab Reviews */}
      {activeTab === 'REVIEWS' && (
        <div className="max-w-3xl space-y-4">
          {reviews.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
              Ainda não há avaliações para este feirante.
            </div>
          ) : (
            reviews.map(rev => (
              <div key={rev.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-feira-100 text-feira-800 font-bold text-xs flex items-center justify-center">
                      {rev.clientName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">{rev.clientName}</h4>
                      <StarRating rating={rev.rating} size="sm" />
                    </div>
                  </div>
                  <span className="text-[10px] text-stone-400">{formatDate(rev.createdAt)}</span>
                </div>
                {rev.comment && (
                  <p className="text-xs text-stone-600 leading-relaxed pl-10">
                    "{rev.comment}"
                  </p>
                )}

                {rev.vendorReply && (
                  <div className="ml-6 sm:ml-10 mt-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Resposta do Feirante
                        </span>
                        <span className="text-xs font-bold text-stone-800">
                          {vendor.businessName}
                        </span>
                      </div>
                      {rev.vendorReplyAt && (
                        <span className="text-[10px] text-stone-400">
                          {formatDate(rev.vendorReplyAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed pl-0.5">
                      {rev.vendorReply}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
