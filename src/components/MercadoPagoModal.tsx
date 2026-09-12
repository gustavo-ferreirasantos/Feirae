'use client';

import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  ShieldAlert, 
  Loader2, 
  X, 
  ExternalLink, 
  XCircle, 
  HandCoins,
  Sparkles,
  Award,
  ShoppingBag
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface MercadoPagoModalProps {
  orderId?: string;
  orderNumber?: string;
  totalAmount: number;
  type?: 'ORDER' | 'FEATURED' | 'PRO_PLAN';
  itemTitle?: string;
  itemDescription?: string;
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
  clientId = 'user-client-1',
  clientName = 'Cliente Feirae',
  clientEmail = 'cliente@feirae.com',
  onSuccess,
  onClose,
  onCancelOrder,
}: MercadoPagoModalProps) {
  const [tab, setTab] = useState<'PIX' | 'CARD' | 'CHECKOUT_PRO'>('PIX');
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSwitchingPayment, setIsSwitchingPayment] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoadingPreference, setIsLoadingPreference] = useState(false);

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

  const fakePixCode = `00020126580014br.gov.bcb.pix0136feirae-sandbox-${effectiveId}520400005303986540${totalAmount.toFixed(2)}5802BR5910FEIRAE6009SAOPAULO62070503***6304ABCD`;

  // Fetch Mercado Pago Checkout Pro Preference on mount
  useEffect(() => {
    async function loadPreference() {
      setIsLoadingPreference(true);
      try {
        const res = await fetch('/api/payments/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: effectiveId,
            orderNumber: effectiveDisplayNumber,
            items: [
              {
                title: effectiveTitle,
                unit_price: totalAmount,
                quantity: 1,
              },
            ],
            payer: {
              name: clientName,
              email: clientEmail,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setCheckoutUrl(data.sandboxInitPoint || data.initPoint || null);
        }
      } catch (err) {
        console.warn('Erro ao carregar preferência Mercado Pago:', err);
      } finally {
        setIsLoadingPreference(false);
      }
    }

    loadPreference();
  }, [effectiveId, effectiveDisplayNumber, effectiveTitle, totalAmount, clientName, clientEmail]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fakePixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    try {
      if (type === 'ORDER' && orderId) {
        const res = await fetch('/api/payments/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            mpPaymentId: `MP-SANDBOX-${Math.floor(1000000 + Math.random() * 9000000)}`,
            status: 'approved',
          }),
        });

        if (res.ok) {
          setPaymentApproved(true);
          setTimeout(() => {
            onSuccess();
          }, 1500);
          return;
        }
      }

      // For vendor services (Featured/Pro) or fallback
      setPaymentApproved(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch {
      setPaymentApproved(true);
      setTimeout(() => onSuccess(), 1500);
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
        <div className="p-5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
              MP
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Mercado Pago Sandbox</h3>
              <p className="text-xs text-sky-100">
                {type === 'ORDER' ? 'Pagamento Seguro de Pedido' : type === 'FEATURED' ? 'Contratação de Destaque' : 'Assinatura Feirante Pro'}
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

        {/* Sandbox Warning Banner */}
        <div className="p-3 bg-amber-50 border-b border-amber-200/80 flex items-center gap-2 text-xs text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span><strong>Ambiente de Testes (Sandbox):</strong> Escolha Pix, Cartão ou Checkout Pro para pagar com segurança.</span>
        </div>

        <div className="p-6">
          {paymentApproved ? (
            <div className="py-8 text-center animate-in zoom-in duration-200">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3 animate-bounce" />
              <h4 className="text-xl font-black text-stone-900">Pagamento Aprovado com Sucesso!</h4>
              <p className="text-xs text-stone-500 mt-1.5 max-w-sm mx-auto">
                {type === 'ORDER'
                  ? `O pedido #${effectiveDisplayNumber} foi confirmado no Mercado Pago Sandbox.`
                  : type === 'FEATURED'
                  ? 'O Destaque Patrocinado foi ativado! Sua barraca está no topo da feira.'
                  : 'Parabéns! Sua assinatura Feirante Pro foi ativada com catálogo ilimitado.'}
              </p>
            </div>
          ) : (
            <>
              {/* Service / Order Info */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 mb-5">
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
                    <span className="text-[11px] text-stone-400 font-bold uppercase block">
                      {type === 'ORDER' ? 'Pedido' : 'Serviço'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-stone-800 line-clamp-1">
                      {effectiveTitle}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-stone-400 font-bold block">Total</span>
                  <span className="text-base sm:text-lg font-black text-feira-700">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex rounded-xl bg-stone-100 p-1 mb-5">
                <button
                  type="button"
                  onClick={() => setTab('PIX')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    tab === 'PIX' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Pix QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setTab('CARD')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    tab === 'CARD' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Cartão de Crédito
                </button>
                <button
                  type="button"
                  onClick={() => setTab('CHECKOUT_PRO')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    tab === 'CHECKOUT_PRO' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <ExternalLink className="w-4 h-4 text-sky-600" />
                  Checkout Pro
                </button>
              </div>

              {/* Tab PIX */}
              {tab === 'PIX' && (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-dashed border-stone-300 inline-block mx-auto">
                    <div className="w-40 h-40 bg-white p-3 border border-stone-200 rounded-xl shadow-xs flex flex-col items-center justify-center relative">
                      {/* SVG QR Code representation */}
                      <svg className="w-32 h-32 text-stone-900" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M0 0h30v30H0zm5 5v20h20V5zm5 5h10v10H10zm60-10h30v30H70zm5 5v20h20V5zm5 5h10v10H80zM0 70h30v30H0zm5 5v20h20V75zm5 5h10v10H10zm45-75h10v10H55zm-15 0h10v20H40zm-5 25h10v10H35zm20 5h10v10H55zm15-5h10v10H70zm-30 20h10v10H40zm15 0h10v25H55zm15 10h10v15H70zm15-5h15v10H85zm0 15h10v10H85zm-45 15h20v10H40zm45-30h10v10H85z" />
                      </svg>
                      <span className="text-[9px] font-mono font-bold text-emerald-700 mt-1">PIX INSTANTÂNEO</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Código Pix Copia e Cola
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={fakePixCode}
                        className="flex-1 px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl text-stone-600 truncate focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1.5 text-center">
                      Abra o app do seu banco, escolha Pix Copia e Cola ou escaneie o QR Code acima.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab CARD */}
              {tab === 'CARD' && (
                <div className="space-y-3 text-xs text-left">
                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-950 flex items-start gap-2.5">
                    <CreditCard className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-blue-900">Cartão de Teste Sandbox Mercado Pago:</p>
                      <p className="font-mono text-[11px] text-blue-800">4242 4242 4242 4242 • Validade 12/28 • CVV 123</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Número do Cartão</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Nome no Cartão</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 uppercase focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Validade</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Código CVV</label>
                        <input
                          type="text"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Parcelamento</label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="1">1x de {formatCurrency(totalAmount)} (Sem juros)</option>
                        <option value="2">2x de {formatCurrency(totalAmount / 2)} (Sem juros)</option>
                        <option value="3">3x de {formatCurrency(totalAmount / 3)} (Sem juros)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab CHECKOUT PRO */}
              {tab === 'CHECKOUT_PRO' && (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 text-left text-xs space-y-2 text-sky-950">
                    <p className="font-bold flex items-center gap-1.5 text-sky-900">
                      <ExternalLink className="w-4 h-4 text-sky-600" />
                      Integração Oficial Checkout Pro Sandbox
                    </p>
                    <p className="text-sky-800/90 leading-relaxed">
                      Você pode pagar diretamente na plataforma do Mercado Pago usando suas credenciais de teste (Public Key e Access Token).
                    </p>
                  </div>

                  {checkoutUrl ? (
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir Checkout Pro no Mercado Pago ({formatCurrency(totalAmount)})
                    </a>
                  ) : (
                    <div className="p-3 text-xs text-stone-400 animate-pulse">
                      {isLoadingPreference ? 'Gerando preferência Mercado Pago...' : 'Carregando link do checkout...'}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-stone-100 space-y-2.5">
                {/* Instant Simulation Button */}
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isSimulating}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aprovando no Sandbox Mercado Pago...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {tab === 'PIX' ? 'Simular Confirmação do Pix' : tab === 'CARD' ? 'Confirmar Pagamento com Cartão' : 'Simular Aprovação Imediata'} ({formatCurrency(totalAmount)})
                    </>
                  )}
                </button>

                {/* For Orders only: Switch to Pickup or Cancel */}
                {type === 'ORDER' && orderId && (
                  <>
                    <button
                      type="button"
                      onClick={handleSwitchToPickup}
                      disabled={isSwitchingPayment}
                      className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <HandCoins className="w-4 h-4 text-stone-600" />
                      {isSwitchingPayment ? 'Atualizando...' : 'Mudar para pagamento presencial na retirada'}
                    </button>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
                        className="py-2 px-3 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        {isCancelling ? 'Cancelando...' : 'Cancelar este pedido'}
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className="py-2 px-3 text-xs text-stone-500 hover:text-stone-800 font-medium rounded-lg transition cursor-pointer"
                      >
                        Pagar mais tarde (Pendente)
                      </button>
                    </div>
                  </>
                )}

                {/* For Non-Order services (Destaque & Plan): Cancel/Close button */}
                {type !== 'ORDER' && (
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2 px-4 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 font-bold rounded-xl transition cursor-pointer"
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

