'use client';

import React, { useState } from 'react';
import { QrCode, CreditCard, CheckCircle2, Copy, ShieldAlert, Loader2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MercadoPagoModalProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  onSuccess: () => void;
  onClose: () => void;
}

export function MercadoPagoModal({
  orderId,
  orderNumber,
  totalAmount,
  onSuccess,
  onClose,
}: MercadoPagoModalProps) {
  const [tab, setTab] = useState<'PIX' | 'CARD'>('PIX');
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);

  const fakePixCode = `00020126580014br.gov.bcb.pix0136feiralocal-sandbox-${orderId}520400005303986540${totalAmount.toFixed(2)}5802BR5910FEIRALOCAL6009SAOPAULO62070503***6304ABCD`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fakePixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    try {
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
      }
    } catch {
      setPaymentApproved(true);
      setTimeout(() => onSuccess(), 1500);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-sky-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
              MP
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Mercado Pago Sandbox</h3>
              <p className="text-xs text-sky-100">Ambiente de teste e simulação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sandbox Warning Banner */}
        <div className="p-3 bg-amber-50 border-b border-amber-200/80 flex items-center gap-2 text-xs text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span><strong>Modo Demonstrativo:</strong> Nenhum valor real será cobrado da sua conta.</span>
        </div>

        <div className="p-6">
          {paymentApproved ? (
            <div className="py-8 text-center animate-in zoom-in duration-200">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-stone-900">Pagamento Simulado Aprovado!</h4>
              <p className="text-xs text-stone-500 mt-1">
                O pré-pedido #{orderNumber} foi pago com sucesso no Sandbox do Mercado Pago.
              </p>
            </div>
          ) : (
            <>
              {/* Order Info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80 mb-5">
                <div>
                  <span className="text-xs text-stone-400 block">Pedido</span>
                  <span className="text-sm font-bold text-stone-800">#{orderNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-400 block">Total a Pagar</span>
                  <span className="text-base font-extrabold text-feira-700">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex rounded-xl bg-stone-100 p-1 mb-5">
                <button
                  type="button"
                  onClick={() => setTab('PIX')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    tab === 'PIX' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Pix Simulado
                </button>
                <button
                  type="button"
                  onClick={() => setTab('CARD')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    tab === 'CARD' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Cartão de Teste
                </button>
              </div>

              {/* Tab PIX */}
              {tab === 'PIX' && (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-dashed border-stone-300 inline-block mx-auto">
                    {/* SVG QR Code Simulation */}
                    <div className="w-40 h-40 bg-white p-2 border border-stone-200 rounded-xl shadow-xs flex flex-col items-center justify-center relative">
                      <QrCode className="w-32 h-32 text-stone-800" />
                      <span className="text-[9px] font-mono text-stone-400 mt-1">SANDBOX PIX</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-stone-600 block mb-1">
                      Código Pix Copia e Cola (Simulado)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={fakePixCode}
                        className="flex-1 px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl text-stone-600 truncate"
                      />
                      <button
                        onClick={handleCopy}
                        className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab CARD */}
              {tab === 'CARD' && (
                <div className="space-y-3 text-xs text-left">
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900">
                    <p className="font-semibold mb-1">Cartão de Crédito Sandbox:</p>
                    <p className="font-mono text-[11px]">Número: 4242 •••• •••• 4242</p>
                    <p className="font-mono text-[11px]">Validade: 12/28 | CVV: 123</p>
                  </div>

                  <div className="space-y-2 text-stone-600">
                    <div>
                      <span className="block font-medium mb-1">Nome no Cartão</span>
                      <input
                        type="text"
                        disabled
                        value="CLIENTE TESTE SANDBOX"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col gap-2">
                <button
                  onClick={handleSimulatePayment}
                  disabled={isSimulating}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold text-sm shadow-md hover:from-sky-700 hover:to-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando no Mercado Pago Sandbox...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Simular Pagamento Aprovado ({formatCurrency(totalAmount)})
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-xs text-stone-500 hover:text-stone-800 font-medium"
                >
                  Voltar e pagar presencialmente na retirada
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
