'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  ShoppingBag, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Store, 
  RotateCcw,
  Star,
  QrCode,
  CreditCard
} from 'lucide-react';
import { Order } from '@/types';
import { useUser } from '@/lib/user-context';
import { useCart } from '@/lib/cart-context';
import { formatCurrency, formatDate, formatWeight } from '@/lib/utils';
import { StarRating } from '@/components/StarRating';
import { ReviewModal } from '@/components/ReviewModal';
import { LoginModal } from '@/components/LoginModal';
import { PickupPassModal } from '@/components/PickupPassModal';
import { MercadoPagoModal } from '@/components/MercadoPagoModal';

function ClientOrdersContent() {
  const { currentUser, isLoaded } = useUser();
  const { addItem } = useCart();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [selectedPassOrder, setSelectedPassOrder] = useState<Order | null>(null);
  const [payOrder, setPayOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      const activeClientId = currentUser?.id || 'user-client-1';
      const res = await fetch('/api/orders?clientId=' + encodeURIComponent(activeClientId));
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync callback params (paid, pending, failure)
  useEffect(() => {
    const isPaid = searchParams.get('paid') === 'true' || searchParams.get('status') === 'approved';
    const isPending = searchParams.get('pending') === 'true' || searchParams.get('status') === 'pending';
    const isCancelled = searchParams.get('cancelled') === 'true' || searchParams.get('status') === 'failure';
    const orderIdParam = searchParams.get('orderId') || searchParams.get('external_reference');

    if (isPaid) {
      if (orderIdParam) {
        fetch('/api/payments/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderIdParam,
            mpPaymentId: searchParams.get('payment_id') || `MP-PAY-${Date.now().toString().slice(-7)}`,
            status: 'approved',
          }),
        }).then(() => fetchOrders()).catch(console.error);
      }
      setActionFeedback('🎉 Pagamento aprovado com sucesso!');
      setTimeout(() => setActionFeedback(null), 5000);
    } else if (isCancelled) {
      setActionFeedback('Pagamento não concluído ou cancelado.');
      setTimeout(() => setActionFeedback(null), 5000);
    } else if (isPending) {
      setActionFeedback('Pedido registrado! Pagamento online pendente.');
      setTimeout(() => setActionFeedback(null), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoaded) {
      fetchOrders();
    }
  }, [isLoaded, currentUser?.id]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Deseja realmente cancelar este pré-pedido? O estoque será devolvido à barraca do feirante.')) {
      return;
    }

    try {
      const activeClientId = currentUser?.id || 'user-client-1';
      const res = await fetch('/api/orders/' + orderId + '?clientId=' + encodeURIComponent(activeClientId), {
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
    if (!order.items || order.items.length === 0) return;

    order.items.forEach(item => {
      addItem(
        {
          id: item.productId,
          vendorId: order.vendorId,
          vendorName: order.vendorName || 'Feirante',
          name: item.productName,
          description: '',
          category: 'Hortifrúti',
          unit: item.productUnit || 'kg',
          price: item.unitPrice,
          stock: 99,
          isActive: true,
          isOrganic: false,
        },
        item.quantity
      );
    });

    setActionFeedback(`Itens do pedido #${order.orderNumber} adicionados ao seu carrinho!`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOVO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">Novo / Recebido</span>;
      case 'EM_PREPARO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Em Separação</span>;
      case 'PRONTO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Pronto para Retirada</span>;
      case 'RETIRADO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">Retirado na Feira</span>;
      case 'CANCELADO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Cancelado</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-stone-400">
        <div className="w-8 h-8 border-4 border-feira-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-stone-500">Carregando seus pré-pedidos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Review Modal */}
      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSuccess={() => {
            setReviewOrder(null);
            setActionFeedback('Avaliação enviada com sucesso! Obrigado pelo feedback.');
            setTimeout(() => setActionFeedback(null), 4000);
            fetchOrders();
          }}
        />
      )}

      {/* Login Modal for Guests */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Meus Pré-pedidos
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Acompanhe o status de preparação dos seus itens e passe na feira para retirar no horário agendado.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-feira-600 hover:bg-feira-700 text-white text-xs font-bold shadow-xs transition"
        >
          <ShoppingBag className="w-4 h-4" />
          Fazer Novo Pedido
        </Link>
      </div>

      {actionFeedback && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-feira-50 text-feira-600 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">Você ainda não fez nenhum pedido</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6">
            Visite as barracas dos feirantes e reserve seus produtos frescos para retirar sem filas na próxima feira!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-feira-600 hover:bg-feira-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            Explorar Produtos da Feira
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 sm:p-6 transition hover:border-stone-300 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-feira-50 border border-feira-100 flex items-center justify-center text-feira-800 shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base text-stone-900">
                        Pedido #{order.orderNumber}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <span className="text-xs text-stone-500 font-medium">
                      Barraca: <strong className="text-stone-800">{order.vendorName || 'Feirante'}</strong> • {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="text-right sm:self-center">
                  <span className="text-xs text-stone-400 block font-bold">Total do Pedido</span>
                  <span className="text-base sm:text-lg font-black text-feira-700">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Items List & Details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7 space-y-2">
                  <span className="text-[11px] uppercase font-bold text-stone-400 tracking-wide block">
                    Itens Reservados:
                  </span>
                  <div className="bg-stone-50 rounded-2xl p-3 divide-y divide-stone-200/60 border border-stone-200/60">
                    {order.items?.map((item, idx) => {
                      const hasWeight = item.measuredWeight !== null && item.measuredWeight !== undefined;
                      return (
                        <div key={idx} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-800">{item.productName}</span>
                            <span className="text-stone-400 text-[11px]">
                              ({formatWeight(item.quantity)} x {formatCurrency(item.unitPrice)}/{item.productUnit || 'un'})
                            </span>
                            {hasWeight && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                                Pesado: {formatWeight(item.measuredWeight!)}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-stone-900">
                            {formatCurrency(item.subtotal || (item.unitPrice * item.quantity))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-5 space-y-2 text-xs bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/60 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[11px] uppercase font-bold text-stone-400 tracking-wide block">
                      Local e Horário da Retirada:
                    </span>
                    <div className="flex items-start gap-1.5 text-stone-700 font-semibold">
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
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Online (Pago)
                        </span>
                      ) : order.paymentStatus === 'PENDENTE' && order.paymentMethod !== 'RETIRADA' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Online (Pendente)
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
                      className="px-3.5 py-1.5 rounded-xl bg-feira-600 hover:bg-feira-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pagar Agora</span>
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

      {/* Payment Modal for Pending Orders */}
      {payOrder && (
        <MercadoPagoModal
          orderId={payOrder.id}
          orderNumber={payOrder.orderNumber}
          totalAmount={payOrder.totalAmount}
          clientId={currentUser?.id || 'user-client-1'}
          clientName={currentUser?.name || payOrder.clientName || 'Cliente Consumidor'}
          clientEmail={currentUser?.email || payOrder.clientEmail || 'cliente@feirae.com'}
          onSuccess={() => {
            setPayOrder(null);
            fetchOrders();
            setActionFeedback('🎉 Pagamento aprovado com sucesso!');
            setTimeout(() => setActionFeedback(null), 5000);
          }}
          onClose={() => {
            setPayOrder(null);
            fetchOrders();
          }}
          onCancelOrder={() => {
            setPayOrder(null);
            fetchOrders();
          }}
        />
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
