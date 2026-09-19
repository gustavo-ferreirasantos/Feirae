'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Store, 
  Clock, 
  CreditCard, 
  ShieldCheck, 
  ArrowRight,
  AlertCircle,
  Loader2,
  QrCode,
  Tag,
  CheckCircle2,
  X,
  Scale,
  Ticket
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useUser } from '@/lib/user-context';
import { formatCurrency, formatWeight, DEFAULT_PRODUCT_IMAGE } from '@/lib/utils';
import { PickupWindow, Coupon } from '@/types';
import { MercadoPagoModal } from '@/components/MercadoPagoModal';

export default function CartCheckoutPage() {
  const router = useRouter();
  const { items, vendorId, vendorName, removeItem, updateQuantity, clearCart, totalAmount, totalItems } = useCart();
  const { currentUser } = useUser();

  const activeVendorId = vendorId || (items.length > 0 ? items[0].product.vendorId : null);

  const [pickupWindows, setPickupWindows] = useState<PickupWindow[]>([]);
  const [selectedWindowId, setSelectedWindowId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'RETIRADA' | 'MERCADO_PAGO_PIX'>('MERCADO_PAGO_PIX');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdOrder, setCreatedOrder] = useState<{ id: string; orderNumber: string; totalAmount: number } | null>(null);
  const [showMpModal, setShowMpModal] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minOrderValue: number;
    discountAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Available Coupons State (US16)
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [loadingAvailableCoupons, setLoadingAvailableCoupons] = useState(false);

  // Dynamic discount calculation
  let discountAmount = 0;
  let isCouponBelowMin = false;
  if (appliedCoupon) {
    if (totalAmount < (appliedCoupon.minOrderValue || 0)) {
      isCouponBelowMin = true;
      discountAmount = 0;
    } else if (appliedCoupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((totalAmount * (appliedCoupon.discountValue / 100)) * 100) / 100;
    } else {
      discountAmount = Math.min(totalAmount, appliedCoupon.discountValue);
    }
  }
  const finalCheckoutAmount = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);

  useEffect(() => {
    if (activeVendorId) {
      fetch('/api/vendors/' + activeVendorId)
        .then(res => res.json())
        .then(data => {
          if (data.pickupWindows && data.pickupWindows.length > 0) {
            setPickupWindows(data.pickupWindows);
            setSelectedWindowId(data.pickupWindows[0].id);
          }
        })
        .catch(console.error);
    }
  }, [activeVendorId]);

  // Fetch available coupons eligible for this cart & vendor
  useEffect(() => {
    if (!activeVendorId || items.length === 0) {
      setAvailableCoupons([]);
      return;
    }

    let isMounted = true;
    setLoadingAvailableCoupons(true);

    fetch(`/api/coupons?vendorId=${encodeURIComponent(activeVendorId)}`)
      .then(res => res.ok ? res.json() : [])
      .then((data: Coupon[]) => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          const now = Date.now();
          const filtered = data.filter(c => {
            // Must be active
            if (!c.active) return false;
            // Must not be expired
            if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return false;
            // Must not exceed max uses
            if (c.maxUses !== null && c.maxUses !== undefined && c.usedCount >= c.maxUses) return false;
            // Must be global or belong to this vendor
            if (c.vendorId && c.vendorId !== activeVendorId) return false;
            return true;
          });
          setAvailableCoupons(filtered);
        } else {
          setAvailableCoupons([]);
        }
      })
      .catch(err => {
        console.error('Erro ao buscar cupons disponíveis:', err);
        if (isMounted) setAvailableCoupons([]);
      })
      .finally(() => {
        if (isMounted) setLoadingAvailableCoupons(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeVendorId, items.length]);

  const applyCouponCode = async (codeToApply: string) => {
    const formatted = codeToApply.trim().toUpperCase();
    if (!formatted) return;

    setCouponInput(formatted);
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formatted,
          cartTotal: totalAmount,
          vendorId: activeVendorId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.error || 'Cupom inválido ou não aplicável.');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: data.coupon.code,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue,
          minOrderValue: data.coupon.minOrderValue,
          discountAmount: data.discountAmount,
        });
        setCouponError(null);
      }
    } catch {
      setCouponError('Erro ao validar o cupom.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    applyCouponCode(couponInput);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !activeVendorId) return;

    if (appliedCoupon && isCouponBelowMin) {
      setError(`O cupom ${appliedCoupon.code} requer um valor mínimo de pedido de ${formatCurrency(appliedCoupon.minOrderValue)}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const selectedWindow = pickupWindows.find(pw => pw.id === selectedWindowId);
    const pickupDateStr = selectedWindow 
      ? 'Próximo ' + selectedWindow.dayOfWeek + ' (' + selectedWindow.startTime + ' às ' + selectedWindow.endTime + ')'
      : 'Próximo dia de feira (08:00 - 11:00)';
    const pickupLocStr = selectedWindow?.location || 'Feira Livre da Praça da Matriz';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: currentUser?.id || 'user-client-1',
          clientName: currentUser?.name || 'Cliente Consumidor',
          clientPhone: currentUser?.phone || '(11) 98765-4321',
          clientEmail: currentUser?.email || 'cliente@feirae.com',
          vendorId: activeVendorId,
          vendorName: vendorName || items[0]?.product?.vendorName || undefined,
          items: items.map(i => ({
            productId: i.product.id,
            productName: i.product.name,
            quantity: i.quantity,
          })),
          paymentMethod,
          pickupDate: pickupDateStr,
          pickupLocation: pickupLocStr,
          notes,
          couponCode: appliedCoupon?.code,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao processar pré-pedido.');
        setIsSubmitting(false);
        return;
      }

      clearCart();

      if (paymentMethod === 'MERCADO_PAGO_PIX') {
        setCreatedOrder({
          id: data.id,
          orderNumber: data.orderNumber,
          totalAmount: data.totalAmount,
        });
        setShowMpModal(true);
      } else {
        router.push('/pedidos?created=true');
      }
    } catch {
      setError('Erro de conexão ao enviar pré-pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-feira-100 text-feira-600 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Seu carrinho está vazio</h2>
        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
          Explore os produtos frescos dos feirantes locais e monte sua reserva para a próxima feira!
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-feira-600 hover:bg-feira-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          Ir para a vitrine de produtos <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {showMpModal && createdOrder && (
        <MercadoPagoModal
          orderId={createdOrder.id}
          orderNumber={createdOrder.orderNumber}
          totalAmount={createdOrder.totalAmount}
          clientId={currentUser?.id || 'user-client-1'}
          clientName={currentUser?.name || 'Cliente Consumidor'}
          clientEmail={currentUser?.email || 'cliente@feirae.com'}
          onSuccess={() => {
            setShowMpModal(false);
            router.push('/pedidos?paid=true');
          }}
          onClose={() => {
            setShowMpModal(false);
            router.push('/pedidos?pending=true');
          }}
          onCancelOrder={() => {
            setShowMpModal(false);
            router.push('/pedidos?cancelled=true');
          }}
        />
      )}

      <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-2">
        Finalizar Pré-pedido
      </h1>
      <p className="text-xs sm:text-sm text-stone-500 mb-8">
        Confirme os itens selecionados e agende o horário da sua retirada presencial.
      </p>

      {currentUser?.role === 'ADMIN' && (
        <div className="mb-6 p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 shrink-0" />
          <span>
            <strong>Modo Administrador:</strong> Administradores não realizam compras de pré-pedidos. Para realizar compras de teste, utilize uma conta de cliente.
          </span>
        </div>
      )}

      {currentUser?.role === 'VENDOR' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            <strong>Modo Feirante:</strong> Feirantes não realizam compras/reservas de produtos. Para realizar compras, utilize uma conta de cliente.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-feira-100 text-feira-800 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Barraca Selecionada:</span>
                <span className="text-sm font-bold text-stone-900">{vendorName}</span>
              </div>
            </div>
            <button
              onClick={clearCart}
              className="text-xs text-red-600 hover:underline font-semibold"
            >
              Esvaziar
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden divide-y divide-stone-100">
            {items.map(item => {
              const isWeighable = Boolean(item.product.isWeighable);
              const subtotal = Math.round((item.product.price * item.quantity) * 100) / 100;
              return (
                <div key={item.product.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200/60">
                      <img
                        src={item.product.imageUrl?.trim() ? item.product.imageUrl.trim() : DEFAULT_PRODUCT_IMAGE}
                        alt={item.product.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-stone-900 truncate">
                          {item.product.name}
                        </h4>
                        {isWeighable && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <Scale className="w-3 h-3 text-amber-700" /> Vendido por peso
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {formatCurrency(item.product.price)} /{item.product.unit}
                      </div>
                      <div className="text-xs font-bold text-feira-700 mt-1">
                        {isWeighable ? (
                          <div>
                            <span>Estimativa: {formatCurrency(subtotal)}</span>
                            <span className="text-[11px] text-stone-500 font-normal ml-1">
                              ({formatWeight(item.quantity)} x {formatCurrency(item.product.price)}/{item.product.unit})
                            </span>
                            <span className="text-[10px] font-medium text-amber-700 block mt-0.5">
                              *Valor final ajustado após pesagem na balança na retirada
                            </span>
                          </div>
                        ) : (
                          <span>Subtotal: {formatCurrency(subtotal)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex flex-col items-end sm:items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      {isWeighable ? (
                        <div className="flex items-center border border-amber-200 rounded-xl bg-amber-50/60 p-1">
                          <button
                            type="button"
                            onClick={() => {
                              const nextQty = Number((item.quantity - 0.1).toFixed(3));
                              if (nextQty <= 0.05) {
                                removeItem(item.product.id);
                              } else {
                                updateQuantity(item.product.id, nextQty);
                              }
                            }}
                            className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-amber-100 transition cursor-pointer"
                            title="Diminuir 100g"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-extrabold text-stone-900 min-w-[50px] text-center font-mono">
                            {formatWeight(item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextQty = Number((item.quantity + 0.1).toFixed(3));
                              updateQuantity(item.product.id, Math.min(item.product.stock, nextQty));
                            }}
                            disabled={item.quantity >= item.product.stock}
                            className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-amber-100 transition disabled:opacity-30 cursor-pointer"
                            title="Aumentar 100g"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-bold text-stone-800 min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="p-2 text-stone-400 hover:text-red-600 transition rounded-xl hover:bg-red-50 cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick presets for weighable item */}
                    {isWeighable && (
                      <div className="flex items-center gap-1">
                        {[0.25, 0.5, 0.75, 1.0, 1.5].map(preset => {
                          const isCurrent = Math.abs(item.quantity - preset) < 0.01;
                          const isOver = preset > item.product.stock;
                          return (
                            <button
                              key={preset}
                              type="button"
                              disabled={isOver}
                              onClick={() => updateQuantity(item.product.id, preset)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              } disabled:opacity-25 disabled:cursor-not-allowed`}
                            >
                              {formatWeight(preset)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5">
          <form onSubmit={handleCheckout} className="bg-white rounded-3xl border border-stone-200 shadow-lg p-6 space-y-6">
            <h3 className="font-extrabold text-stone-900 text-base pb-3 border-b border-stone-100">
              Detalhes da Retirada
            </h3>

            {/* Weighable items notice if cart has any weighable item */}
            {items.some(i => i.product.isWeighable) && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
                <Scale className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[11px] text-amber-900">Preço aproximado em itens pesáveis</div>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Seu pedido contém itens vendidos por peso. O valor total acima é estimado e será conferido na balança da barraca na hora da retirada.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-feira-600" />
                Selecione a Janela de Retirada na Feira:
              </label>

              {pickupWindows.length > 0 ? (
                <div className="space-y-2">
                  {pickupWindows.map(pw => (
                    <label
                      key={pw.id}
                      className={'flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition ' + (
                        selectedWindowId === pw.id
                          ? 'border-feira-600 bg-feira-50/60 font-semibold text-stone-900'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="pickupWindow"
                          checked={selectedWindowId === pw.id}
                          onChange={() => setSelectedWindowId(pw.id)}
                          className="text-feira-600 focus:ring-feira-500"
                        />
                        <div>
                          <div>{pw.dayOfWeek} — {pw.startTime} às {pw.endTime}</div>
                          <div className="text-[10px] text-stone-400 font-normal">{pw.location}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-500">
                  Sábado: 08:00 às 11:30 (Feira Livre da Praça da Matriz)
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-feira-600" />
                Opção de Pagamento:
              </label>

              <div className="space-y-2.5">
                {/* Opção 1: Presencial */}
                <label
                  className={'flex items-center justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition ' + (
                    paymentMethod === 'RETIRADA'
                      ? 'border-feira-600 bg-feira-50/60 font-semibold text-stone-900 shadow-2xs'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'RETIRADA'}
                      onChange={() => setPaymentMethod('RETIRADA')}
                      className="text-feira-600 focus:ring-feira-500"
                    />
                    <div>
                      <div className="font-bold text-stone-900">Pagamento Presencial na Retirada</div>
                      <div className="text-[10px] text-stone-500 font-normal">Pague em dinheiro, Pix ou cartão na barraca</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                    Padrão
                  </span>
                </label>

                {/* Opção 2: Pagamento Online (Pix / Cartão) */}
                <label
                  className={'flex items-center justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition ' + (
                    paymentMethod === 'MERCADO_PAGO_PIX'
                      ? 'border-feira-600 bg-feira-50/60 font-semibold text-stone-900 shadow-2xs'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'MERCADO_PAGO_PIX'}
                      onChange={() => setPaymentMethod('MERCADO_PAGO_PIX')}
                      className="text-feira-600 focus:ring-feira-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        <QrCode className="w-3.5 h-3.5 text-feira-600" />
                        Pagamento Online (Pix / Cartão)
                      </div>
                      <div className="text-[10px] text-stone-500 font-normal">Pague via Pix Instantâneo ou Cartão de Crédito</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full font-bold">
                    Online
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-feira-600" />
                Cupom de Desconto:
              </label>

              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Ex: FEIRA10"
                    className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-feira-500 uppercase font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponInput.trim()}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Aplicar'}
                  </button>
                </div>
              ) : (
                <div className={`flex items-center justify-between p-3 rounded-2xl border ${
                  isCouponBelowMin 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {isCouponBelowMin ? (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <div className={`text-xs font-bold flex items-center gap-1.5 ${
                        isCouponBelowMin ? 'text-amber-900' : 'text-emerald-900'
                      }`}>
                        <span>Cupom {appliedCoupon.code}</span>
                        {!isCouponBelowMin && (
                          <span className="bg-emerald-200 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                            -{formatCurrency(discountAmount)}
                          </span>
                        )}
                      </div>
                      <div className={`text-[10px] font-medium ${
                        isCouponBelowMin ? 'text-amber-700 font-semibold' : 'text-emerald-700'
                      }`}>
                        {isCouponBelowMin 
                          ? `Pedido mínimo de ${formatCurrency(appliedCoupon.minOrderValue)} necessário para ativar o desconto.`
                          : 'Desconto aplicado com sucesso!'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 text-stone-500 hover:text-red-600 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                    title="Remover cupom"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {couponError && (
                <p className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{couponError}</span>
                </p>
              )}

              {/* Seção: Cupons Disponíveis */}
              <div className="mt-3.5 pt-3 border-t border-stone-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5 uppercase tracking-wide">
                    <Ticket className="w-3.5 h-3.5 text-amber-600" />
                    Cupons disponíveis
                  </span>
                  {availableCoupons.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {availableCoupons.length} {availableCoupons.length === 1 ? 'disponível' : 'disponíveis'}
                    </span>
                  )}
                </div>

                {loadingAvailableCoupons ? (
                  <div className="p-3 text-center text-[11px] text-stone-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-feira-600" />
                    <span>Buscando cupons disponíveis...</span>
                  </div>
                ) : availableCoupons.length === 0 ? (
                  <p className="text-[11px] text-stone-400 italic">
                    Nenhum cupom promocional disponível para esta banca no momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableCoupons.map(c => {
                      const isApplied = appliedCoupon?.code === c.code;
                      const hasMinOrder = Boolean(c.minOrderValue && c.minOrderValue > 0);
                      const isBelowMin = hasMinOrder && totalAmount < c.minOrderValue;
                      const missingAmount = isBelowMin ? c.minOrderValue - totalAmount : 0;

                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                            isApplied
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                              : isBelowMin
                              ? 'bg-stone-50/80 border-stone-200'
                              : 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-white border border-stone-300 text-stone-900 tracking-wider">
                                {c.code}
                              </span>
                              <span className="font-extrabold text-xs text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                                {c.discountType === 'PERCENTAGE'
                                  ? `${c.discountValue}% OFF`
                                  : `${formatCurrency(c.discountValue)} OFF`}
                              </span>
                              {!c.vendorId ? (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                                  Global
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/60 border border-amber-200 px-1.5 py-0.5 rounded-md truncate max-w-[150px]">
                                  {vendorName || 'Banca'}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-stone-600">
                              {hasMinOrder ? (
                                isBelowMin ? (
                                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    Pedido mínimo de {formatCurrency(c.minOrderValue)} (Faltam {formatCurrency(missingAmount)})
                                  </span>
                                ) : (
                                  <span className="text-stone-500">
                                    Pedido mínimo: {formatCurrency(c.minOrderValue)}
                                  </span>
                                )
                              ) : (
                                <span className="text-stone-400">Sem valor mínimo de pedido</span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            {isApplied ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aplicado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => applyCouponCode(c.code)}
                                disabled={isValidatingCoupon || isBelowMin}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                  isBelowMin
                                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-200'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                }`}
                                title={
                                  isBelowMin
                                    ? `Adicione mais ${formatCurrency(missingAmount)} para ativar este cupom`
                                    : `Aplicar cupom ${c.code}`
                                }
                              >
                                {isValidatingCoupon && couponInput === c.code ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  'Aplicar'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Instruções para o Feirante (Opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Instruções adicionais de preparo ou embalagem..."
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-feira-500"
              />
            </div>

            <div className="pt-4 border-t border-stone-100 space-y-2">
              <div className="flex justify-between text-xs text-stone-500">
                <span>{items.some(i => i.product.isWeighable) ? 'Subtotal estimado de itens:' : 'Subtotal de itens:'}</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              {appliedCoupon && !isCouponBelowMin && (
                <div className="flex justify-between text-xs text-emerald-600 font-bold">
                  <span>Desconto ({appliedCoupon.code}):</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-stone-500">
                <span>Taxa de serviço do app:</span>
                <span className="text-emerald-600 font-semibold">Grátis (Demonstrativo)</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-stone-900 pt-2 border-t border-stone-100">
                <div>
                  <span>{items.some(i => i.product.isWeighable) ? 'Valor Total Estimado:' : 'Valor Total:'}</span>
                  {items.some(i => i.product.isWeighable) && (
                    <span className="text-[10px] text-amber-700 font-normal block">
                      *Sujeito a pesagem final na balança
                    </span>
                  )}
                </div>
                <span className="text-feira-700">{formatCurrency(finalCheckoutAmount)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || currentUser?.role === 'ADMIN' || currentUser?.role === 'VENDOR'}
              className="w-full py-3.5 px-4 rounded-xl bg-feira-600 hover:bg-feira-700 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmando pré-pedido...
                </>
              ) : currentUser?.role === 'ADMIN' ? (
                <span>Administrador não pode finalizar pedidos</span>
              ) : currentUser?.role === 'VENDOR' ? (
                <span>Feirante não pode finalizar pedidos</span>
              ) : (
                <>
                  <span>
                    Confirmar Pré-pedido ({formatCurrency(finalCheckoutAmount)}{items.some(i => i.product.isWeighable) ? ' aprox.' : ''})
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Garantia de reserva. Sem cancelamentos de última hora.</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
