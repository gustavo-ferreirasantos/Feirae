'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  X, 
  XCircle, 
  HandCoins,
  Sparkles,
  Award,
  ShoppingBag,
  CreditCard,
  QrCode,
  Copy,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface MercadoPagoModalProps {
  orderId?: string;
  orderNumber?: string;
  totalAmount: number;
  type?: 'ORDER' | 'FEATURED' | 'PRO_PLAN';
  itemTitle?: string;
  itemDescription?: string;
  initialTab?: 'PIX' | 'CARD';
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  onSuccess: () => void;
  onClose: () => void;
  onCancelOrder?: () => void;
}

export function MercadoPagoModal({
  orderId,
  orderNumber,
  totalAmount,
  type = 'ORDER',
  itemTitle,
  itemDescription,
  initialTab = 'PIX',
  clientId = 'user-client-1',
  clientName = 'Cliente Feirae',
  clientEmail = 'cliente@feirae.com',
  onSuccess,
  onClose,
  onCancelOrder,
}: MercadoPagoModalProps) {
  const [tab, setTab] = useState<'PIX' | 'CARD'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSwitchingPayment, setIsSwitchingPayment] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState(clientName.toUpperCase());
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [installments, setInstallments] = useState('1');

  // Resolved reference info
  const effectiveId = orderId || `srv-${type.toLowerCase()}-${Date.now().toString().slice(-6)}`;
  const effectiveTitle = itemTitle || (
    type === 'FEATURED' 
      ? 'Destaque Patrocinado na Vitrine (7 dias)' 
      : type === 'PRO_PLAN' 
      ? 'Assinatura Plano Feirante Pro (Mensal)' 
      : `Pedido #${orderNumber || '0000'} na Feira Livre`
  );
  const effectiveDisplayNumber = orderNumber || (
    type === 'FEATURED' 
      ? 'DESTAQUE-FEIRANTE' 
      : type === 'PRO_PLAN' 
      ? 'PLANO-PRO' 
      : effectiveId
  );

  const fakePixCode = `00020126580014br.gov.bcb.pix0136feirae-online-${effectiveId}520400005303986540${totalAmount.toFixed(2)}5802BR5910FEIRAE6009SAOPAULO62070503***6304ABCD`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(fakePixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setIsSimulating(true);
    try {
      if (type === 'ORDER' && orderId) {
        const res = await fetch('/api/payments/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            mpPaymentId: `MP-PAY-${Math.floor(1000000 + Math.random() * 9000000)}`,
            status: 'approved',
          }),
        });

        if (res.ok) {
          setPaymentApproved(true);
          setTimeout(() => {
            onSuccess();
          }, 1400);
          return;
        }
      }

      setPaymentApproved(true);
      setTimeout(() => {
        onSuccess();
      }, 1400);
    } catch {
      setPaymentApproved(true);
      setTimeout(() => onSuccess(), 1400);
    } finally {
      setIsSimulating(false);
    }
  };

  // Cancel order in database and store, restoring stock
  const handleCancelOrder = async () => {
    if (!confirm('Deseja realmente cancelar este pedido? O estoque será devolvido à banca do feirante e o pedido não será cobrado.')) {
      return;
    }

    if (!orderId) {
      onClose();
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}?clientId=${clientId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (onCancelOrder) {
          onCancelOrder();
        } else {
          onClose();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao cancelar o pedido.');
      }
    } catch {
      alert('Erro de conexão ao cancelar pedido.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Switch payment to Pay at Pickup (Presencial)
  const handleSwitchToPickup = async () => {
    if (!orderId) return;
    setIsSwitchingPayment(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'RETIRADA',
          paymentStatus: 'PAGO_NA_RETIRADA',
        }),
      });

      if (res.ok) {
        onClose();
      }
    } catch {
      onClose();
    } finally {
      setIsSwitchingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-feira-600 via-feira-700 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm shadow-inner">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base leading-tight">
                  Pagamento Seguro
                </h3>
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Pix & Cartão
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                {type === 'ORDER' ? 'Confirmação do Pedido' : type === 'FEATURED' ? 'Contratação de Destaque' : 'Assinatura Feirante Pro'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Fechar janela de pagamento"
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs for switching between Pix and Card */}
        <div className="flex rounded-xl bg-stone-100 p-1 mx-5 mt-4">
          <button
            type="button"
            onClick={() => setTab('PIX')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              tab === 'PIX' ? 'bg-white text-emerald-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            Pix Instantâneo
          </button>
          <button
            type="button"
            onClick={() => setTab('CARD')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              tab === 'CARD' ? 'bg-white text-blue-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-600" />
            Cartão de Crédito
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {paymentApproved ? (
            <div className="py-8 text-center animate-in zoom-in duration-200">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3 animate-bounce" />
              <h4 className="text-xl font-black text-stone-900">Pagamento Confirmado com Sucesso!</h4>
              <p className="text-xs text-stone-500 mt-1.5 max-w-sm mx-auto">
                {type === 'ORDER'
                  ? `O pedido #${effectiveDisplayNumber} foi confirmado com sucesso.`
                  : type === 'FEATURED'
                  ? 'O Destaque Patrocinado foi ativado! Sua barraca está no topo da feira.'
                  : 'Parabéns! Sua assinatura Feirante Pro foi ativada com catálogo ilimitado.'}
              </p>
            </div>
          ) : (
            <>
              {/* Service / Order Summary Card */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-700 shadow-xs">
                    {type === 'ORDER' ? (
                      <ShoppingBag className="w-5 h-5 text-feira-600" />
                    ) : type === 'FEATURED' ? (
                      <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400" />
                    ) : (
                      <Award className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-extrabold uppercase block tracking-wide">
                      {type === 'ORDER' ? 'Resumo do Pedido' : 'Serviço'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-stone-900 line-clamp-1">
                      {effectiveTitle}
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      #{effectiveDisplayNumber}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-stone-400 font-bold uppercase block">Valor Total</span>
                  <span className="text-base sm:text-lg font-black text-feira-700">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* TAB 1: PIX INSTANTÂNEO */}
              {tab === 'PIX' && (
                <div className="space-y-3.5 text-center">
                  <div className="p-3 bg-stone-50 rounded-2xl border border-dashed border-stone-300 inline-block mx-auto">
                    <div className="w-36 h-36 bg-white p-2.5 border border-stone-200 rounded-xl shadow-xs flex flex-col items-center justify-center">
                      <svg className="w-28 h-28 text-stone-900" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M0 0h30v30H0zm5 5v20h20V5zm5 5h10v10H10zm60-10h30v30H70zm5 5v20h20V5zm5 5h10v10H80zM0 70h30v30H0zm5 5v20h20V75zm5 5h10v10H10zm45-75h10v10H55zm-15 0h10v20H40zm-5 25h10v10H35zm20 5h10v10H55zm15-5h10v10H70zm-30 20h10v10H40zm15 0h10v25H55zm15 10h10v15H70zm15-5h15v10H85zm0 15h10v10H85zm-45 15h20v10H40zm45-30h10v10H85z" />
                      </svg>
                      <span className="text-[8px] font-mono font-bold text-emerald-700 mt-1">PIX INSTANTÂNEO</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={fakePixCode}
                        className="flex-1 px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl text-stone-600 truncate focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Abra o aplicativo do seu banco e pague com o Pix Copia e Cola ou escaneie o QR Code.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isSimulating}
                    className="w-full py-3.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirmar Pagamento do Pix ({formatCurrency(totalAmount)})</span>
                  </button>
                </div>
              )}

              {/* TAB 2: CARTÃO DE CRÉDITO */}
              {tab === 'CARD' && (
                <div className="space-y-3 text-xs text-left">
                  <div className="space-y-2.5">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1 text-[11px]">Número do Cartão</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-feira-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1 text-[11px]">Nome do Titular</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 uppercase focus:outline-none focus:border-feira-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1 text-[11px]">Validade</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-feira-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1 text-[11px]">CVV</label>
                        <input
                          type="text"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-feira-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1 text-[11px]">Parcelamento</label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:border-feira-500"
                      >
                        <option value="1">1x de {formatCurrency(totalAmount)} (Sem juros)</option>
                        <option value="2">2x de {formatCurrency(totalAmount / 2)} (Sem juros)</option>
                        <option value="3">3x de {formatCurrency(totalAmount / 3)} (Sem juros)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isSimulating}
                    className="w-full mt-2 py-3.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-feira-600 hover:bg-feira-700 text-white shadow-md shadow-feira-600/25 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirmar Pagamento com Cartão ({formatCurrency(totalAmount)})</span>
                  </button>
                </div>
              )}

              {/* Action Buttons & Navigation */}
              <div className="mt-4 pt-3 border-t border-stone-100 space-y-2">
                {/* For Orders only: Switch to Pickup or Cancel */}
                {type === 'ORDER' && orderId && (
                  <>
                    <button
                      type="button"
                      onClick={handleSwitchToPickup}
                      disabled={isSwitchingPayment}
                      className="w-full py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <HandCoins className="w-4 h-4 text-stone-600" />
                      {isSwitchingPayment ? 'Atualizando...' : 'Mudar para pagamento presencial na retirada'}
                    </button>

                    <div className="pt-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
                        className="py-1.5 px-3 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {isCancelling ? 'Cancelando...' : 'Cancelar este pedido'}
                      </button>
                    </div>
                  </>
                )}

                {/* For Non-Order services (Destaque & Plan): Cancel/Close button */}
                {type !== 'ORDER' && (
                  <div className="pt-1 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-1.5 px-4 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 font-bold rounded-xl transition cursor-pointer"
                    >
                      Cancelar e Fechar
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
