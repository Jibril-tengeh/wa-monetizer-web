import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  FlaskConical,
  Smartphone,
  Download,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { Payment } from '../types/index.ts';
import { formatMoney, formatGHS, formatDateFR } from '../utils/formatters.ts';
import { ReceiptModal } from './ReceiptModal.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface PaymentsViewProps {
  payments: Payment[];
  onVerifyPaymentOnServer: (reference: string, provider: string) => Promise<any>;
  isSandboxMode: boolean;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  onVerifyPaymentOnServer,
  isSandboxMode
}) => {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'failed'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);

  const handleCopy = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Reference', 'Client', 'Telephone', 'Montant', 'Devise', 'Canal', 'Fournisseur', 'Statut'];
    const rows = filteredPayments.map((p) => [
      `"${p.createdAt || ''}"`,
      `"${p.providerReference || ''}"`,
      `"${p.customerName || ''}"`,
      `"${p.customerPhone || ''}"`,
      p.amount || 0,
      `"${p.currency || 'GHS'}"`,
      `"${p.channel || ''}"`,
      `"${p.provider || ''}"`,
      `"${p.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wtm_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualVerify = async (payment: Payment) => {
    setVerifyingRef(payment.providerReference);
    setVerifyMessage(null);
    try {
      const res = await onVerifyPaymentOnServer(payment.providerReference, payment.provider);
      setVerifyMessage(`Résultat serveur : ${res.verified ? 'Vérifié avec succès !' : 'En attente ou échoué'}`);
    } catch (err: any) {
      setVerifyMessage(`Erreur : ${err.message}`);
    } finally {
      setVerifyingRef(null);
      setTimeout(() => setVerifyMessage(null), 4000);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = p.providerReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.customerName && p.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.customerPhone && p.customerPhone.includes(searchTerm));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || p.provider === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const totalConfirmed = payments
    .filter((p) => p.status === 'verified')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner and Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{t('payments.title', 'Transactions & Paiements (GHS)')}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {payments.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t('payments.subtitle', 'Historique certifié par passerelle bancaire (Paystack, Hubtel & Sandbox).')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors shadow-xs"
            title={language === 'en' ? 'Export accounting history to CSV (Excel compatible)' : "Exporter l'historique comptable au format CSV (compatible Excel)"}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{language === 'en' ? 'Export CSV (Excel)' : 'Exporter CSV (Excel)'}</span>
          </button>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-emerald-800 dark:text-emerald-300">
                {language === 'en' ? 'Collected Revenue' : 'Revenus Encaissés'}
              </div>
              <div className="text-lg font-black text-emerald-900 dark:text-emerald-100">
                {formatGHS(totalConfirmed)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      {verifyMessage && (
        <div className="p-3 rounded-xl bg-zinc-900 text-white text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{verifyMessage}</span>
          </div>
          <button onClick={() => setVerifyMessage(null)} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={t('payments.searchPlaceholder', 'Rechercher par référence, nom client, numéro...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Provider selector */}
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
        >
          <option value="all">{language === 'en' ? 'All Gateways' : 'Toutes passerelles'}</option>
          <option value="paystack">Paystack Ghana</option>
          <option value="hubtel">Hubtel Ghana</option>
          <option value="sandbox">Sandbox (Test)</option>
        </select>

        {/* Status filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'verified', 'pending', 'failed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize shrink-0 transition-colors ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {st === 'all'
                ? t('common.all', 'Tous')
                : st === 'verified'
                ? t('payments.verified', 'Vérifiés')
                : st === 'pending'
                ? t('payments.pending', 'En attente')
                : t('payments.failed', 'Échoués')}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-10 text-center">
          <CreditCard className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {t('payments.noPayments', 'Aucune transaction trouvée')}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {language === 'en'
              ? 'Payments initiated via Mobile Money or bank cards will be listed here in real-time.'
              : 'Les paiements initiés via Mobile Money ou carte bancaire seront listés ici en temps réel.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">{t('receipt.date', 'Date')}</th>
                  <th className="py-3 px-4">{t('payments.reference', 'Référence Passerelle')}</th>
                  <th className="py-3 px-4">{t('payments.customer', 'Client')}</th>
                  <th className="py-3 px-4">{t('payments.channel', 'Mode / Réseau')}</th>
                  <th className="py-3 px-4">{t('payments.amount', 'Montant')}</th>
                  <th className="py-3 px-4">{t('payments.status', 'Statut')}</th>
                  <th className="py-3 px-4 text-right">{t('common.actions', 'Contrôle')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    
                    {/* Date */}
                    <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap">
                      {formatDateFR(payment.createdAt, true)}
                    </td>

                    {/* Reference with copy */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        <span className="truncate max-w-[140px]" title={payment.providerReference}>
                          {payment.providerReference}
                        </span>
                        <button
                          onClick={() => handleCopy(payment.providerReference)}
                          className="text-zinc-400 hover:text-zinc-600 transition-colors"
                          title="Copier la référence"
                        >
                          {copiedRef === payment.providerReference ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-zinc-400 uppercase">
                        {payment.provider} {payment.isSandbox ? '(Sandbox)' : ''}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {payment.customerName || 'Client invité'}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {payment.customerPhone || '—'}
                      </div>
                    </td>

                    {/* Channel & Network */}
                    <td className="py-3.5 px-4">
                      <div className="capitalize font-medium text-zinc-800 dark:text-zinc-200">
                        {payment.channel === 'mobile_money'
                          ? 'Mobile Money'
                          : language === 'en'
                          ? 'Bank Card'
                          : 'Carte Bancaire'}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {payment.momoProvider || (payment.channel === 'mobile_money' ? 'MTN / Telecel' : 'Visa / Mastercard')}
                      </div>
                    </td>

                    {/* Amount in Transaction Currency */}
                    <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                      {formatMoney(payment.amount, payment.currency || 'GHS')}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        payment.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : payment.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {payment.status === 'verified' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{t('payments.verified', 'Vérifié')}</span>
                          </>
                        ) : payment.status === 'pending' ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{t('payments.pending', 'En attente')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>{t('payments.failed', 'Échoué')}</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Server verification & Receipt action */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReceiptPayment(payment)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 transition-colors"
                          title={language === 'en' ? 'Generate and print official receipt (PDF)' : 'Générer et imprimer le reçu officiel (PDF)'}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{language === 'en' ? 'Receipt' : 'Reçu'}</span>
                        </button>

                        <button
                          onClick={() => handleManualVerify(payment)}
                          disabled={verifyingRef === payment.providerReference}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50"
                          title={language === 'en' ? 'Query provider API to verify status' : "Interroger l'API du fournisseur pour confirmer le statut"}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${verifyingRef === payment.providerReference ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">{language === 'en' ? 'Verify' : 'Vérifier'}</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceiptPayment && (
        <ReceiptModal
          payment={{
            reference: selectedReceiptPayment.providerReference,
            amount: selectedReceiptPayment.amount,
            currency: selectedReceiptPayment.currency || 'GHS',
            customerName: selectedReceiptPayment.customerName || 'Membre WTM',
            customerPhone: selectedReceiptPayment.customerPhone || '—',
            channel: selectedReceiptPayment.channel,
            momoProvider: selectedReceiptPayment.momoProvider,
            provider: selectedReceiptPayment.provider,
            verifiedAt: selectedReceiptPayment.verifiedAt || selectedReceiptPayment.createdAt,
            createdAt: selectedReceiptPayment.createdAt
          }}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}

    </div>
  );
};
