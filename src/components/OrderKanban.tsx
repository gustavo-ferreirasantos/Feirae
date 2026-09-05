'use client';

import React, { useState } from 'react';
import { 
  Clock, 
  PackageCheck, 
  CheckCircle, 
  Truck, 
  AlertTriangle, 
  ChevronRight, 
  User, 
  Phone, 
  MapPin,
  Calendar,
  XCircle,
  Loader2,
  Ban,
  Eye,
  EyeOff,
  MessageCircle,
  Scale,
  CheckCircle2
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getClientReadyNotifyLink } from '@/lib/whatsapp';

interface OrderKanbanProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onOrderUpdated?: (order: Order) => void;
  fairs?: Array<{ id: string; name: string; operatingDays?: string | string[] }>;
}

export function OrderKanban({ orders, onUpdateStatus, onOrderUpdated, fairs }: OrderKanbanProps) {
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedFairFilter, setSelectedFairFilter] = useState<string>('ALL');
  const [itemWeights, setItemWeights] = useState<Record<string, string>>({});
  const [savingWeightItemId, setSavingWeightItemId] = useState<string | null>(null);
  const [weightSuccessId, setWeightSuccessId] = useState<string | null>(null);

  // Filter orders by selected fair
  const filteredOrders = orders.filter(o => {
    if (selectedFairFilter === 'ALL') return true;
    const locLower = (o.pickupLocation || '').toLowerCase();
    if (selectedFairFilter === 'fair-1') {
      return locLower.includes('matriz') || locLower.includes('centro') || !locLower;
    }
    if (selectedFairFilter === 'fair-2') {
      return locLower.includes('bairro novo');
    }
    if (selectedFairFilter === 'fair-3') {
      return locLower.includes('parque') || locLower.includes('agroecol');
    }
    return locLower.includes(selectedFairFilter.toLowerCase());
  });

  const handleSaveWeight = async (orderId: string, itemId: string) => {
    const weightStr = itemWeights[itemId];
    const weightNum = parseFloat(weightStr);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('Por favor, digite um peso válido aferido na balança (ex: 0.850).');
      return;
    }

    setSavingWeightItemId(itemId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          measuredWeight: weightNum,
        }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        if (onOrderUpdated) {
          onOrderUpdated(updatedOrder);
        }
        setWeightSuccessId(itemId);
        setTimeout(() => setWeightSuccessId(null), 3000);
      } else {
        alert('Erro ao atualizar o peso aferido.');
      }
    } catch (err) {
      console.error('Erro ao salvar peso:', err);
    } finally {
      setSavingWeightItemId(null);
    }
  };

  const columns: Array<{
    status: OrderStatus;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
  }> = [
    {
      status: 'NOVO',
      title: 'Novos Pré-pedidos',
      description: 'Aguardando confirmação',
      icon: Clock,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50/70',
      borderColor: 'border-amber-200',
    },
    {
      status: 'EM_PREPARO',
      title: 'Em Preparo / Embalando',
      description: 'Sendo separados na barraca',
      icon: PackageCheck,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200',
    },
    {
      status: 'PRONTO',
      title: 'Pronto para Retirada',
      description: 'Aguardando cliente na barraca',
      icon: CheckCircle,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-200',
    },
    {
      status: 'RETIRADO',
      title: 'Retirados / Concluídos',
      description: 'Entregues com sucesso',
      icon: Truck,
      color: 'text-stone-700',
      bgColor: 'bg-stone-100/70',
      borderColor: 'border-stone-200',
    },
  ];

  const cancelledOrders = filteredOrders.filter(o => o.status?.toUpperCase() === 'CANCELADO');

  const handleAdvance = async (order: Order) => {
    let nextStatus: OrderStatus | null = null;
    const current = order.status?.toUpperCase();
    if (current === 'NOVO') nextStatus = 'EM_PREPARO';
    else if (current === 'EM_PREPARO') nextStatus = 'PRONTO';
    else if (current === 'PRONTO') nextStatus = 'RETIRADO';

    if (nextStatus) {
      setLoadingOrderId(order.id);
      try {
        await onUpdateStatus(order.id, nextStatus);
        
        // Disparo/Notificação automática via WhatsApp se o pedido foi marcado como PRONTO
        if (nextStatus === 'PRONTO') {
          const waUrl = getClientReadyNotifyLink(order);
          window.open(waUrl, '_blank');
        }
      } finally {
        setLoadingOrderId(null);
      }
    }
  };

  const handleCancel = async (orderId: string) => {
    if (confirm('Deseja realmente cancelar este pedido? O estoque dos produtos será estornado automaticamente no sistema.')) {
      setLoadingOrderId(orderId);
      try {
        await onUpdateStatus(orderId, 'CANCELADO');
      } finally {
        setLoadingOrderId(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Bar with Fair Filter (US23) & Cancelled Orders Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-feira-100 text-feira-800">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-stone-700">Filtrar por Feira:</span>
          <select
            value={selectedFairFilter}
            onChange={e => setSelectedFairFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="ALL">Todas as Feiras da Semana</option>
            {fairs && fairs.length > 0 ? (
              fairs.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({Array.isArray(f.operatingDays) ? f.operatingDays.join(', ') : f.operatingDays})
                </option>
              ))
            ) : (
              <>
                <option value="fair-1">Feira Livre da Praça da Matriz (Sábado)</option>
                <option value="fair-2">Feira Noturna do Bairro Novo (Quarta-feira)</option>
                <option value="fair-3">Feira Agroecológica do Parque (Domingo)</option>
              </>
            )}
          </select>
          {selectedFairFilter !== 'ALL' && (
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
              {filteredOrders.length} pedidos
            </span>
          )}
        </div>

        {cancelledOrders.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowCancelled(!showCancelled)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-600 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {showCancelled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showCancelled ? 'Ocultar' : 'Exibir'} Cancelados ({cancelledOrders.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map(col => {
          const columnOrders = filteredOrders.filter(o => o.status?.toUpperCase() === col.status);
          const IconComponent = col.icon;

          return (
            <div
              key={col.status}
              className={`rounded-2xl border ${col.borderColor} ${col.bgColor} p-3 flex flex-col min-h-[520px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg bg-white shadow-xs ${col.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-stone-900 leading-tight">{col.title}</h4>
                    <p className="text-[10px] text-stone-500">{col.description}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-white shadow-xs text-stone-800">
                  {columnOrders.length}
                </span>
              </div>

              {/* Orders Stack */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
                {columnOrders.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-center p-4 text-xs text-stone-400">
                    Nenhum pedido nesta etapa
                  </div>
                ) : (
                  columnOrders.map(order => (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5"
                    >
                      {/* Header Card */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-mono font-bold text-feira-800 bg-feira-100 px-2 py-0.5 rounded-md">
                            #{order.orderNumber}
                          </span>
                          <div className="text-[10px] text-stone-400 mt-1">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <span className="text-sm font-extrabold text-stone-900">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>

                      {/* Client Details */}
                      <div className="text-xs space-y-1 py-1.5 border-y border-stone-100">
                        <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                          <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{order.clientName}</span>
                        </div>
                        {order.clientPhone && (
                          <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{order.clientPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">Retirada: {order.pickupDate}</span>
                        </div>
                        {order.pickupLocation && (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[10px] bg-emerald-50/80 px-2 py-0.5 rounded-lg border border-emerald-100">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate" title={order.pickupLocation}>{order.pickupLocation}</span>
                          </div>
                        )}
                      </div>

                      {/* Items Summary */}
                      {order.items && order.items.length > 0 && (
                        <div className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl space-y-2 border border-stone-100">
                          <div className="font-semibold text-[10px] uppercase tracking-wider text-stone-400">
                            Itens do Pedido:
                          </div>
                          {order.items.map(item => {
                            const isWeighable = item.productUnit?.toLowerCase() === 'kg' || item.measuredWeight !== undefined;
                            return (
                              <div key={item.id} className="space-y-1 pt-1.5 border-t border-stone-200/60 first:border-0 first:pt-0">
                                <div className="flex justify-between gap-1 items-start">
                                  <span className="truncate max-w-[160px] font-medium text-stone-900">
                                    {item.measuredWeight ? `${item.measuredWeight}kg` : `${item.quantity}x`} {item.productName}
                                  </span>
                                  <span className="font-bold text-stone-800 shrink-0">
                                    {formatCurrency(item.subtotal || item.unitPrice * item.quantity)}
                                  </span>
                                </div>

                                {isWeighable && (
                                  <div className="bg-amber-50/90 rounded-xl p-2 border border-amber-200/80 space-y-1.5 mt-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-bold text-amber-950 flex items-center gap-1">
                                        <Scale className="w-3 h-3 text-amber-700" />
                                        Pesagem na Balança:
                                      </span>
                                      {item.measuredWeight ? (
                                        <span className="font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded text-[9px]">
                                          ✓ {item.measuredWeight} kg aferido
                                        </span>
                                      ) : (
                                        <span className="text-amber-700 font-semibold text-[9px]">
                                          Pendente (est. {item.quantity} kg)
                                        </span>
                                      )}
                                    </div>

                                    {order.status?.toUpperCase() !== 'RETIRADO' && order.status?.toUpperCase() !== 'CANCELADO' && (
                                      <div className="flex items-center gap-1.5 pt-0.5">
                                        <div className="relative flex-1">
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={itemWeights[item.id] !== undefined ? itemWeights[item.id] : (item.measuredWeight ?? item.quantity)}
                                            onChange={e => setItemWeights(prev => ({ ...prev, [item.id]: e.target.value }))}
                                            placeholder="Peso real"
                                            className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500 pr-7"
                                          />
                                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400">
                                            kg
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleSaveWeight(order.id, item.id)}
                                          disabled={savingWeightItemId === item.id}
                                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition shrink-0 cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
                                          title="Gravar peso da balança e recalcular subtotal"
                                        >
                                          {savingWeightItemId === item.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            'Aferir'
                                          )}
                                        </button>
                                      </div>
                                    )}

                                    {weightSuccessId === item.id && (
                                      <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 pt-0.5 animate-in fade-in">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Subtotal recalculado!
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Payment Tag */}
                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className="text-stone-400 font-medium">Pagamento:</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-full ${
                          order.paymentStatus === 'SIMULADO_APROVADO'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.paymentStatus === 'SIMULADO_APROVADO' ? '✓ MP Pago' : 'Presencial na Retirada'}
                        </span>
                      </div>

                      {/* Actions */}
                      {order.status?.toUpperCase() !== 'RETIRADO' && order.status?.toUpperCase() !== 'CANCELADO' && (
                        <div className="pt-2 flex gap-1.5">
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={loadingOrderId === order.id}
                            className="px-2.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition flex items-center justify-center shrink-0 cursor-pointer"
                            title="Cancelar pedido e estornar estoque"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>

                          <a
                            href={getClientReadyNotifyLink(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition flex items-center justify-center shrink-0 cursor-pointer"
                            title="Avisar cliente no WhatsApp com 1 clique"
                          >
                            <MessageCircle className="w-4 h-4 fill-emerald-600/20" />
                          </a>

                          <button
                            onClick={() => handleAdvance(order)}
                            disabled={loadingOrderId === order.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-feira-600 hover:bg-feira-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-70 cursor-pointer"
                          >
                            {loadingOrderId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <span>
                                  {order.status?.toUpperCase() === 'NOVO' && 'Iniciar Preparo'}
                                  {order.status?.toUpperCase() === 'EM_PREPARO' && 'Marcar Pronto'}
                                  {order.status?.toUpperCase() === 'PRONTO' && 'Confirmar Retirada'}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancelled Orders Drawer / Section */}
      {showCancelled && cancelledOrders.length > 0 && (
        <div className="mt-6 p-5 rounded-2xl bg-red-50/50 border border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <Ban className="w-4 h-4 text-red-600" />
            <h4 className="font-bold text-sm text-red-900">Histórico de Pedidos Cancelados</h4>
            <span className="text-xs text-red-600 font-medium">(Estoque estornado automaticamente)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cancelledOrders.map(order => (
              <div key={order.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-stone-800">
                  <span>#{order.orderNumber}</span>
                  <span className="text-red-600 font-extrabold">{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="text-[11px] text-stone-500">{order.clientName} • {formatDate(order.createdAt)}</div>
                <div className="text-[10px] text-stone-400">{order.items?.length || 0} itens estornados</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
