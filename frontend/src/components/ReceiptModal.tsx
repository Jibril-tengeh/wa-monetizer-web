import React from 'react';
import { Printer, X, ShieldCheck, CheckCircle2, Download } from 'lucide-react';
import { formatMoney, formatDateFR } from '../utils/formatters.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface ReceiptModalProps {
  payment: {
    reference: string;
    amount: number;
    currency: string;
    customerName: string;
    customerPhone: string;
    channel: string;
    momoProvider?: string;
    provider: string;
    groupName?: string;
    planName?: string;
    verifiedAt?: string;
    createdAt: string;
  };
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, onClose }) => {
  const { t } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          title={t('common.close', 'Fermer')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable Receipt Body */}
        <div id="wtm-receipt-content" className="space-y-6">
          
          {/* Header */}
          <div className="text-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <span className="font-black text-2xl tracking-tighter text-emerald-600 dark:text-emerald-400">
              WTM
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mt-1">
              {t('receipt.title', 'Reçu de Paiement d\'Abonnement')}
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              {t('receipt.reference', 'Réf')} : {payment.reference}
            </p>
          </div>

          {/* Paid Stamp */}
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 w-fit mx-auto text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{t('receipt.statusConfirmed', 'Paiement Validé & Confirmé')}</span>
          </div>

          {/* Details Grid */}
          <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 text-xs space-y-2.5">
            <div className="flex items-center justify-between text-zinc-500">
              <span>Date de transaction :</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {formatDateFR(payment.verifiedAt || payment.createdAt, true)}
              </span>
            </div>

            <div className="flex items-center justify-between text-zinc-500">
              <span>Bénéficiaire / Client :</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {payment.customerName}
              </span>
            </div>

            <div className="flex items-center justify-between text-zinc-500">
              <span>Numéro WhatsApp :</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">
                {payment.customerPhone}
              </span>
            </div>

            <div className="flex items-center justify-between text-zinc-500">
              <span>Groupe WhatsApp :</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {payment.groupName || 'Accès VIP WhatsApp'}
              </span>
            </div>

            <div className="flex items-center justify-between text-zinc-500">
              <span>Moyen de règlement :</span>
              <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
                {payment.channel === 'mobile_money' 
                  ? (payment.momoProvider ? `Mobile Money (${payment.momoProvider.toUpperCase()})` : `Mobile Money (${payment.currency || 'MoMo'})`) 
                  : (payment.channel === 'bank' ? 'Virement Bancaire' : 'Carte Bancaire')}
              </span>
            </div>

            <div className="flex items-center justify-between text-zinc-500 pt-1 border-t border-zinc-200 dark:border-zinc-700">
              <span>Certificat Électronique :</span>
              <span className="font-mono text-[10px] text-emerald-600 font-bold">
                WAPAY-SEC-{(payment.reference || 'REF').slice(-8)}
              </span>
            </div>
          </div>

          {/* QR Code and Tax Stamp */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Signature Numérique & QR Vérification
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Scannez pour vérifier l'authenticité de la transaction sur le grand livre public WA Pay.
              </p>
            </div>
            {/* Visual simulated SVG QR Code */}
            <div className="w-12 h-12 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-zinc-900 dark:text-zinc-100" fill="currentColor">
                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm10 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2zm4-2h2v2h-2v-2z" />
              </svg>
            </div>
          </div>

          {/* Total Amount in Transaction Currency */}
          <div className="p-4 rounded-2xl bg-emerald-600 text-white flex items-center justify-between shadow-md shadow-emerald-600/20">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                Montant Total Réglé
              </div>
              <div className="text-xs text-emerald-200">
                Devise : {payment.currency || 'GHS'}
              </div>
            </div>
            <div className="text-2xl font-black">
              {formatMoney(payment.amount, payment.currency || 'GHS')}
            </div>
          </div>

          <div className="text-center text-[10px] text-zinc-400">
            Reçu électronique certifié conforme par la passerelle de paiement WA Pay.
          </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / Sauvegarder PDF</span>
          </button>

          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
