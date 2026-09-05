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
  Scale
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useUser } from '@/lib/user-context';
import { formatCurrency } from '@/lib/utils';
import { PickupWindow } from '@/types';
import { MercadoPagoModal } from '@/components/MercadoPagoModal';

export default function CartCheckoutPage() {
  const router = useRouter();
  const { items, vendorId, vendorName, removeItem, updateQuantity, clearCart, totalAmount, totalItems } = useCart();
  const { currentUser } = useUser();

  const [pickupWindows, setPickupWindows] = useState<PickupWindow[]>([]);
  const [selectedWindowId, setSelectedWindowId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'RETIRADA' | 'MERCADO_PAGO_PIX' | 'MERCADO_PAGO_CARTAO'>('RETIRADA');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdOrder, setCreatedOrder] = useState<{ id: string; orderNumber: string; totalAmount: number } | null>(null);
  const [showMpModal, setShowMpModal] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalCheckoutAmount = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);

  useEffect(() => {
    if (vendorId) {
      fetch('/api/vendors/' + vendorId)
        .then(res => res.json())
        .then(data => {
          if (data.pickupWindows && data.pickupWindows.length > 0) {
            setPickupWindows(data.pickupWindows);
            setSelectedWindowId(data.pickupWindows[0].id);
          }
        })
        .catch(console.error);
    }
  }, [vendorId]);

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponInput.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput,
          cartTotal: totalAmount,
          vendorId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.error || 'Cupom inválido ou não aplicável.');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: data.coupon.code,
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

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !vendorId) return;

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
          vendorId: vendorId,
          items: items.map(i => ({
            productId: i.product.id,
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

      if (paymentMethod === 'MERCADO_PAGO_PIX' || paymentMethod === 'MERCADO_PAGO_CARTAO') {
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
          onSuccess={() => {
            setShowMpModal(false);
            router.push('/pedidos?paid=true');
          }}
          onClose={() => {
            setShowMpModal(false);
            router.push('/pedidos');
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
            {items.map(item => (
              <div key={item.product.id} className="p-4 sm:p-5 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <Store className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-sm font-bold text-stone-900 truncate">
                      {item.product.name}
                    </h4>
                    {item.product.isWeighable && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Scale className="w-3 h-3 text-amber-700" /> Vendido por peso
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {formatCurrency(item.product.price)} /{item.product.unit}
                  </div>
                  <div className="text-xs font-bold text-feira-700 mt-1">
                    {item.product.isWeighable ? 'Estimativa: ' : 'Subtotal: '}
                    {formatCurrency(item.product.price * item.quantity)}
                    {item.product.isWeighable && (
                      <span className="text-[10px] font-medium text-amber-700 block mt-0.5">
                        *Valor final ajustado após pesagem na balança na retirada
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 p-1">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-bold text-stone-800 min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-2 text-stone-400 hover:text-red-600 transition rounded-xl hover:bg-red-50"
                    title="Remover item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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

              <div className="space-y-2">
                <label
                  className={'flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition ' + (
                    paymentMethod === 'RETIRADA'
                      ? 'border-feira-600 bg-feira-50/60 font-semibold text-stone-900'
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
                      <div>Pagamento Presencial na Retirada</div>
                      <div className="text-[10px] text-stone-400 font-normal">Pague em dinheiro, Pix ou cartão na barraca</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    Padrão
                  </span>
                </label>

                <label
                  className={'flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition ' + (
                    paymentMethod === 'MERCADO_PAGO_PIX'
                      ? 'border-sky-600 bg-sky-50/60 font-semibold text-stone-900'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'MERCADO_PAGO_PIX'}
                      onChange={() => setPaymentMethod('MERCADO_PAGO_PIX')}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="flex items-center gap-1 font-semibold text-sky-900">
                        <QrCode className="w-3.5 h-3.5 text-sky-600" />
                        Mercado Pago Sandbox (Pix / Cartão)
                      </div>
                      <div className="text-[10px] text-stone-400 font-normal">Simulação online instantânea</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
                    Sandbox
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
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <span>Cupom {appliedCoupon.code}</span>
                        <span className="bg-emerald-200 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                          -{formatCurrency(appliedCoupon.discountAmount)}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">Desconto aplicado com sucesso!</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 text-emerald-700 hover:text-red-600 hover:bg-emerald-100 rounded-lg transition"
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
                <span>Subtotal de itens:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-xs text-emerald-600 font-bold">
                  <span>Desconto ({appliedCoupon.code}):</span>
                  <span>- {formatCurrency(appliedCoupon.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-stone-500">
                <span>Taxa de serviço do app:</span>
                <span className="text-emerald-600 font-semibold">Grátis (Demonstrativo)</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-stone-900 pt-2 border-t border-stone-100">
                <span>Valor Total:</span>
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
                  <span>Confirmar Pré-pedido ({formatCurrency(finalCheckoutAmount)})</span>
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
