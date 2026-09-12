'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Package, 
  Clock, 
  MapPin, 
  Calendar, 
  RotateCcw, 
  XCircle, 
  Star, 
  CheckCircle2, 
  Truck,
  Store,
  QrCode,
  Scale,
  CreditCard
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { useUser } from '@/lib/user-context';
import { useCart } from '@/lib/cart-context';
import { formatCurrency, formatDate, formatWeight } from '@/lib/utils';
import { StarRating } from '@/components/StarRating';
import { ReviewModal } from '@/components/ReviewModal';
import { LoginModal } from '@/components/LoginModal';
import { PickupPassModal } from '@/components/PickupPassModal';
import { MercadoPagoModal } from '@/components/MercadoPagoModal';

function ClientOrdersContent() {
  const { currentUser } = useUser();
  const { addItem } = useCart();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [selectedPassOrder, setSelectedPassOrder] = useState<Order | null>(null);
  const [payOrder, setPayOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (searchParams.get('paid') === 'true') {
      setActionFeedback('Pagamento aprovado com sucesso via Mercado Pago Sandbox!');
      setTimeout(() => setActionFeedback(null), 5000);
    } else if (searchParams.get('cancelled') === 'true') {
      setActionFeedback('Pedido cancelado com sucesso e itens estornados para o feirante.');
      setTimeout(() => setActionFeedback(null), 5000);
    } else if (searchParams.get('pending') === 'true') {
      setActionFeedback('Pedido registrado! Pagamento Mercado Pago pendente.');
      setTimeout(() => setActionFeedback(null), 5000);
    }
  }, [searchParams]);

  const fetchOrders = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/orders?clientId=' + (currentUser?.id || ''));
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentUser?.id]);

  const handleCancelOrder = async (orderId: string) => {
    if (!currentUser?.id) return;
    if (!confirm('Deseja realmente cancelar este pré-pedido? O estoque será devolvido à barraca do feirante.')) {
      return;
    }

    try {
      const res = await fetch('/api/orders/' + orderId + '?clientId=' + (currentUser?.id || ''), {
        method: 'DELETE',
      });

      if (res.ok) {
        setActionFeedback('Pedido cancelado com sucesso e estoque estornado.');
        setTimeout(() => setActionFeedback(null), 3000);
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao cancelar pedido.');
      }
    } catch {
      alert('Erro de conexão ao cancelar.');
    }
  };

  const handleRepeatOrder = (order: Order) => {
    let addedCount = 0;
    for (const item of order.items) {
      const res = addItem({
        id: item.productId,
        vendorId: order.vendorId,
        vendorName: order.vendorName,
        name: item.productName,
        description: '',
        category: '',
        unit: item.productUnit,
        price: item.unitPrice,
        stock: 50,
        isOrganic: false,
        isActive: true,
      }, item.quantity);
      if (res.success) addedCount++;
    }

    setActionFeedback(addedCount + ' item(ns) adicionado(s) novamente ao seu carrinho!');
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const getStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
      NOVO: { label: 'Aguardando Preparo', bg: 'bg-amber-100', text: 'text-amber-800', icon: Clock },
      EM_PREPARO: { label: 'Em Separação', bg: 'bg-blue-100', text: 'text-blue-800', icon: Package },
      PRONTO: { label: 'Pronto para Retirada!', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle2 },
      RETIRADO: { label: 'Concluído / Retirado', bg: 'bg-stone-100', text: 'text-stone-700', icon: Truck },
      CANCELADO: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };
    const item = map[status];
    const Icon = item.icon;
    return (
      <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ' + item.bg + ' ' + item.text}>
        <Icon className="w-3.5 h-3.5" />
        {item.label}
      </span>
    );
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-feira-100 text-feira-700 flex items-center justify-center mx-auto shadow-xs">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Acesse seus Pré-pedidos</h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
          Faça login com sua conta de cliente para visualizar seu histórico de pedidos, código de retirada e avaliações de feirantes.
        </p>
        <div className="pt-2">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-feira-600 hover:bg-feira-700 text-white font-bold text-xs shadow-xs transition"
          >
            Entrar na Minha Conta
          </button>
        </div>
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSuccess={() => {
            setReviewOrder(null);
            setActionFeedback('Avaliação enviada com sucesso!');
            setTimeout(() => setActionFeedback(null), 3000);
            fetchOrders();
          }}
        />
      )}

      {payOrder && (
        <MercadoPagoModal
          orderId={payOrder.id}
          orderNumber={payOrder.orderNumber}
          totalAmount={payOrder.totalAmount}
          clientId={currentUser?.id || payOrder.clientId}
          clientName={currentUser?.name || payOrder.clientName}
          clientEmail={currentUser?.email || payOrder.clientEmail}
          onSuccess={() => {
            setPayOrder(null);
            setActionFeedback('Pagamento aprovado com sucesso via Mercado Pago Sandbox!');
            fetchOrders();
          }}
          onClose={() => {
            setPayOrder(null);
            fetchOrders();
          }}
          onCancelOrder={() => {
            setPayOrder(null);
            setActionFeedback('Pedido cancelado com sucesso e estoque estornado.');
            fetchOrders();
          }}
        />
      )}

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
          Meus Pré-pedidos
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Acompanhe o status de preparo, retire na feira e avalie os feirantes.
        </p>
      </div>

      {actionFeedback && (
        <div className="p-3.5 rounded-2xl bg-stone-900 text-white text-xs font-semibold text-center animate-in fade-in">
          {actionFeedback}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-3xl border border-stone-200 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 max-w-md mx-auto">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Você não possui pedidos</h3>
          <p className="text-xs text-stone-500 mt-1">
            Navegue pelas barracas da feira e reserve seus produtos frescos!
          </p>
          <Link
            href="/"
            className="mt-4 inline-block px-4 py-2 bg-feira-600 text-white rounded-xl text-xs font-semibold"
          >
            Explorar Feira
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-3xl border border-stone-200/90 shadow-xs hover:shadow-md transition p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-feira-100 text-feira-800 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">{order.vendorName}</span>
                      <span className="text-xs font-mono font-bold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                        #{order.orderNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-400">{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                <div>
                  {getStatusBadge(order.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1 text-xs">
                <div className="space-y-1.5 bg-stone-50 p-3.5 rounded-2xl">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-stone-400 block mb-1">
                    Itens Reservados:
                  </span>
                  {order.items.map(item => {
                    const isWeighable = item.productUnit?.toLowerCase() === 'kg' || item.measuredWeight != null || item.quantity % 1 !== 0;
                    return (
                      <div key={item.id} className="flex justify-between items-start text-stone-700">
                        <div>
                          <span>
                            {item.measuredWeight ? `${item.measuredWeight}kg` : (isWeighable ? `${formatWeight(item.quantity)} aprox.` : `${item.quantity}x`)} {item.productName}
                          </span>
                          {item.measuredWeight != null && (
                            <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                              <Scale className="w-2.5 h-2.5 shrink-0" />
                              <span>Peso aferido na balança: <strong>{item.measuredWeight} kg</strong></span>
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-stone-900">{formatCurrency(item.subtotal)}</span>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-stone-200 flex justify-between font-extrabold text-stone-900">
                    <span>Total:</span>
                    <span className="text-feira-700">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>

                <div className="space-y-2 bg-stone-50 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-1.5 text-stone-600">
                      <Calendar className="w-3.5 h-3.5 text-feira-600 shrink-0 mt-0.5" />
                      <span>{order.pickupDate}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-stone-600">
                      <MapPin className="w-3.5 h-3.5 text-feira-600 shrink-0 mt-0.5" />
                      <span>{order.pickupLocation}</span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1.5 flex-wrap">
                      <span>Pagamento:</span>
                      {order.paymentStatus === 'SIMULADO_APROVADO' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Mercado Pago (Pago)
                        </span>
                      ) : order.paymentStatus === 'PENDENTE' && (order.paymentMethod === 'MERCADO_PAGO_PIX' || order.paymentMethod === 'MERCADO_PAGO_CARTAO') ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Mercado Pago (Pendente)
                        </span>
                      ) : (
                        <strong className="text-stone-800">Presencial na Retirada</strong>
                      )}
                    </div>
                  </div>

                  {order.notes && (
                    <p className="text-[11px] italic text-stone-500 bg-white p-2 rounded-xl border border-stone-200">
                      "{order.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {order.paymentStatus === 'PENDENTE' && order.status !== 'CANCELADO' && (
                    <button
                      onClick={() => setPayOrder(order)}
                      className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pagar no Mercado Pago</span>
                    </button>
                  )}

                  {order.status !== 'CANCELADO' && order.status !== 'RETIRADO' && (
                    <button
                      onClick={() => setSelectedPassOrder(order)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-feira-600 to-emerald-600 hover:from-feira-700 hover:to-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pass de Retirada (QR)</span>
                    </button>
                  )}

                  {(order.status === 'NOVO' || order.status === 'EM_PREPARO') && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancelar
                    </button>
                  )}

                  {order.status === 'RETIRADO' && (
                    order.review ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 px-3 py-1.5 rounded-xl">
                          <span className="font-semibold text-stone-700">Sua avaliação:</span>
                          <StarRating rating={order.review.rating} size="sm" />
                        </div>
                        {order.review.vendorReply && (
                          <div className="text-[11px] bg-emerald-50 text-emerald-950 border border-emerald-200/80 rounded-xl p-2.5 space-y-1 animate-in fade-in">
                            <span className="font-bold flex items-center gap-1 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resposta do Feirante:
                            </span>
                            <p className="italic text-stone-700 leading-relaxed">"{order.review.vendorReply}"</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewOrder(order)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" />
                        Avaliar Feirante
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => handleRepeatOrder(order)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-feira-50 hover:text-feira-800 text-stone-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Repetir este Pedido
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Pickup Pass Modal */}
      {selectedPassOrder && (
        <PickupPassModal
          order={selectedPassOrder}
          onClose={() => setSelectedPassOrder(null)}
        />
      )}

    </div>
  );
}

export default function ClientOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-stone-400">
          <div className="w-8 h-8 border-4 border-feira-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-stone-500">Carregando seus pré-pedidos...</p>
        </div>
      }
    >
      <ClientOrdersContent />
    </Suspense>
  );
}
