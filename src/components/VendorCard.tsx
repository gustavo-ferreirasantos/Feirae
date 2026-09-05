'use client';

import React from 'react';
import Link from 'next/link';
import { Store, MapPin, Award, ArrowRight } from 'lucide-react';
import { Vendor } from '@/types';
import { StarRating } from './StarRating';

export function VendorCard({ vendor }: { vendor: Vendor }) {
  return (
    <div className="group bg-white rounded-2xl border border-stone-200 hover:border-feira-400/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Cover Image */}
      <div className="h-28 w-full bg-stone-100 relative overflow-hidden">
        {vendor.coverImage ? (
          <img
            src={vendor.coverImage}
            alt={vendor.businessName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-feira-600 to-feira-800" />
        )}
        {(vendor.isSubscriber || vendor.plan === 'PRO') && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-950 shadow-md flex items-center gap-1 z-10">
            <Award className="w-3 h-3 text-stone-900" />
            Parceiro Pro
          </span>
        )}
        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-stone-800 backdrop-blur-xs shadow-xs">
          {vendor.category}
        </span>
      </div>

      {/* Profile & Info */}
      <div className="p-4 pt-0 flex-1 flex flex-col justify-between relative">
        <div className="flex items-end gap-3 -mt-6 mb-3">
          <div className="w-14 h-14 rounded-2xl border-2 border-white bg-white shadow-md overflow-hidden shrink-0">
            {vendor.avatar ? (
              <img src={vendor.avatar} alt={vendor.businessName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-feira-100 text-feira-700 flex items-center justify-center">
                <Store className="w-7 h-7" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-0.5">
            <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-tight truncate group-hover:text-feira-700 transition-colors">
              {vendor.businessName}
            </h3>
            <div className="mt-1">
              <StarRating rating={vendor.rating} count={vendor.ratingCount} showText size="sm" />
            </div>
          </div>
        </div>

        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">
          {vendor.description}
        </p>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-stone-500 truncate max-w-[200px]">
            <MapPin className="w-3.5 h-3.5 text-feira-600 shrink-0" />
            <span className="truncate">{vendor.fairLocation}</span>
          </div>

          <Link
            href={`/feirantes/${vendor.id}`}
            className="inline-flex items-center gap-1 font-semibold text-feira-700 group-hover:text-feira-900 group-hover:translate-x-0.5 transition-all shrink-0"
          >
            Ver catálogo <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
