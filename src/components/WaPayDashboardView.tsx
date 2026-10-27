import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RotateCcw, 
  Globe2, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  Search, 
  Copy, 
  Check, 
  Smartphone, 
  FileSpreadsheet, 
  Coins, 
  Building2, 
  HelpCircle,
  ExternalLink,
  Filter,
  Wallet,
  ArrowDownToLine,
  Send,
  Info,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCheck,
  UserCheck,
  Database,
  Sparkles
} from 'lucide-react';
import { WaPayFrontendTransaction, WaPaySettlementData, WaPayBalanceData, WaPayPayoutItem } from '../types/index.ts';
import { formatGHS, formatDateFR } from '../utils/formatters.ts';
import { syncWaPayTransactionToFirestore, syncWaPayPayoutToFirestore } from '../services/firestoreService.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface WaPayDashboardViewProps {
  onNavigateToPublicJoin?: () => void;
}

export const WaPayDashboardView: React.FC<WaPayDashboardViewProps> = ({ onNavigateToPublicJoin }) => {
  const { t, language } = useLanguage();
  const [transactions, setTransactions] = useState<WaPayFrontendTransaction[]>([]);
  const [settlement, setSettlement] = useState<WaPaySettlementData | null>(null);
  const [balanceData, setBalanceData] = useState<WaPayBalanceData | null>(null);
  const [payouts, setPayouts] = useState<WaPayPayoutItem[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wallet' | 'transactions' | 'connectors'>('wallet');

  // Filters & UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [showExplainer, setShowExplainer] = useState(true);

  // Payout Modals State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Destination Config Modal State
  const [showDestModal, setShowDestModal] = useState(false);
  const [destChannel, setDestChannel] = useState<'mobile_money' | 'bank_transfer'>('mobile_money');
  const [destMomoProvider, setDestMomoProvider] = useState('MTN MoMo');
  const [destPhoneNumber, setDestPhoneNumber] = useState('+233 24 555 1234');
  const [destAccountName, setDestAccountName] = useState('Kwame Mensah');
  const [destBankName, setDestBankName] = useState('GCB Bank');
  const [destAccountNumber, setDestAccountNumber] = useState('');
  const [destCountry, setDestCountry] = useState('GH');
  const [destLoading, setDestLoading] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);

  // Refund Modal State
  const [refundTarget, setRefundTarget] = useState<WaPayFrontendTransaction | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // KYC & Split Payment & Firestore Sync State (Suggestions 2, 4, 5)
  const [kycProfile, setKycProfile] = useState<any>(null);
  const [splitConfig, setSplitConfig] = useState<any>(null);
  const [firestoreSyncing, setFirestoreSyncing] = useState(false);
  const [firestoreSynced, setFirestoreSynced] = useState(false);

  const fetchWaPayData = async () => {
    setLoading(true);
    try {
      const [txRes, setRes, provRes, balRes, payRes, kycRes, splitRes] = await Promise.all([
        fetch('/api/v1/transactions'),
        fetch('/api/v1/settlements'),
        fetch('/api/v1/providers/status'),
        fetch('/api/v1/payouts/balance'),
        fetch('/api/v1/payouts'),
        fetch('/api/v1/kyc/status'),
        fetch('/api/v1/merchants/split-config')
      ]);

      const [txData, setData, provData, balData, payData, kycData, splitData] = await Promise.all([
        txRes.json(),
        setRes.json(),
        provRes.json(),
        balRes.json(),
        payRes.json(),
        kycRes.json(),
        splitRes.json()
      ]);

      if (txData.transactions) setTransactions(txData.transactions);
      if (setData) setSettlement(setData);
      if (provData.connectors) setProviders(provData.connectors);
      if (kycData?.profile) setKycProfile(kycData.profile);
      if (splitData) setSplitConfig(splitData);
      if (balData) {
        setBalanceData(balData);
        if (balData.defaultPayoutDestination) {
          setDestChannel(balData.defaultPayoutDestination.channel || 'mobile_money');
          setDestMomoProvider(balData.defaultPayoutDestination.momoProvider || 'MTN MoMo');
          setDestPhoneNumber(balData.defaultPayoutDestination.phoneNumber || '');
          setDestAccountName(balData.defaultPayoutDestination.accountName || '');
          setDestBankName(balData.defaultPayoutDestination.bankName || '');
          setDestAccountNumber(balData.defaultPayoutDestination.accountNumber || '');
          setDestCountry(balData.defaultPayoutDestination.country || 'GH');
        }
      }
      if (payData && payData.payouts) setPayouts(payData.payouts);
    } catch (err: any) {
      console.error("Failed to load WA Pay data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFirestore = async () => {
    setFirestoreSyncing(true);
    try {
      for (const tx of transactions) {
        await syncWaPayTransactionToFirestore(tx);
      }
      for (const po of payouts) {
        await syncWaPayPayoutToFirestore(po);
      }
      setFirestoreSynced(true);
      setTimeout(() => setFirestoreSynced(false), 3000);
      setFeedbackMsg("Grand livre SBI Pay synchronisé avec Cloud Firestore !");
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(`Erreur de synchronisation Firestore : ${err.message}`);
    } finally {
      setFirestoreSyncing(false);
    }
  };

  useEffect(() => {
    fetchWaPayData();
  }, []);

  const handleCopy = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleVerifyDirect = async (reference: string) => {
    try {
      const res = await fetch('/api/v1/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference })
      });
      const data = await res.json();
      setFeedbackMsg(`Vérification : ${data.message || (data.verified ? 'Confirmé' : 'Échec')}`);
      setTimeout(() => setFeedbackMsg(null), 4000);
      fetchWaPayData();
    } catch (err: any) {
      setFeedbackMsg(`Erreur : ${err.message}`);
    }
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget || !refundReason.trim()) {
      setRefundError('Veuillez indiquer un motif de remboursement');
      return;
    }

    setRefundLoading(true);
    setRefundError(null);
    try {
      const res = await fetch('/api/v1/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: refundTarget.reference,
          reason: refundReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec du remboursement');

      setFeedbackMsg(`Remboursement enregistré pour la transaction ${refundTarget.reference}`);
      setTimeout(() => setFeedbackMsg(null), 4000);
      setRefundTarget(null);
      setRefundReason('');
      fetchWaPayData();
    } catch (err: any) {
      setRefundError(err.message);
    } finally {
      setRefundLoading(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayoutError("Veuillez saisir un montant valide.");
      return;
    }
    if (balanceData && amt > balanceData.availableBalanceGHS) {
      setPayoutError(`Le montant demandé dépasse votre solde disponible (${formatGHS(balanceData.availableBalanceGHS)}).`);
      return;
    }
    if (amt < 5) {
      setPayoutError("Le montant minimum de retrait est de 5.00 GH₵.");
      return;
    }

    setPayoutLoading(true);
    setPayoutError(null);
    try {
      const res = await fetch('/api/v1/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          destination: balanceData?.defaultPayoutDestination
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de la demande de retrait");
      }

      setFeedbackMsg(data.message || `Retrait de ${amt} GH₵ effectué avec succès !`);
      setTimeout(() => setFeedbackMsg(null), 5000);
      setShowPayoutModal(false);
      setPayoutAmount('');
      fetchWaPayData();
    } catch (err: any) {
      setPayoutError(err.message);
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destAccountName.trim()) {
      setDestError("Le nom du titulaire du compte est obligatoire.");
      return;
    }
    if (destChannel === 'mobile_money' && !destPhoneNumber.trim()) {
      setDestError("Le numéro de téléphone Mobile Money est obligatoire.");
      return;
    }
    if (destChannel === 'bank_transfer' && (!destBankName.trim() || !destAccountNumber.trim())) {
      setDestError("Le nom de la banque et le numéro de compte sont obligatoires.");
      return;
    }

    setDestLoading(true);
    setDestError(null);
    try {
      const res = await fetch('/api/v1/payouts/destination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: {
            channel: destChannel,
            momoProvider: destChannel === 'mobile_money' ? destMomoProvider : undefined,
            phoneNumber: destChannel === 'mobile_money' ? destPhoneNumber : undefined,
            accountName: destAccountName.trim(),
            bankName: destChannel === 'bank_transfer' ? destBankName : undefined,
            accountNumber: destChannel === 'bank_transfer' ? destAccountNumber : undefined,
            country: destCountry
          }
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur de configuration");
      }

      setFeedbackMsg("Compte de retrait configuré avec succès !");
      setTimeout(() => setFeedbackMsg(null), 4000);
      setShowDestModal(false);
      fetchWaPayData();
    } catch (err: any) {
      setDestError(err.message);
    } finally {
      setDestLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesCurrency = currencyFilter === 'all' || t.pricing.chargedCurrency === currencyFilter;
    return matchesSearch && matchesStatus && matchesCurrency;
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider border border-emerald-500/40">
              {language === 'en' ? 'SBI Pay • Payment Rails & Payouts' : 'SBI Pay • Système de Paiement & Retraits'}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {language === 'en' ? 'Live Rails & Ledger' : 'Connecteurs & Registre Actifs'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{t('wapay.title', 'Moteur Financier SBI Pay & Portefeuille Admin')}</span>
          </h1>
          <p className="text-xs text-zinc-300 max-w-xl">
            {t('wapay.subtitle', 'Infrastructure de paiement multi-devises, registre financier auditable et conformité bancaire.')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchWaPayData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors shadow-xs"
            title={language === 'en' ? 'Refresh live data' : 'Rafraîchir les données en direct'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{language === 'en' ? 'Refresh' : 'Actualiser'}</span>
          </button>

          <button
            onClick={handleSyncFirestore}
            disabled={firestoreSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors shadow-xs"
            title={language === 'en' ? 'Sync ledger and payouts to Cloud Firestore' : 'Synchroniser le grand livre et les retraits dans Google Cloud Firestore'}
          >
            <Database className={`w-3.5 h-3.5 ${firestoreSyncing ? 'animate-spin text-emerald-400' : firestoreSynced ? 'text-emerald-400' : 'text-blue-400'}`} />
            <span>{firestoreSyncing ? (language === 'en' ? 'Syncing...' : 'Synchronisation...') : firestoreSynced ? (language === 'en' ? 'Synced!' : 'Synchronisé !') : t('wapay.syncFirestoreBtn', 'Sync Firestore')}</span>
          </button>

          {onNavigateToPublicJoin && (
            <button
              onClick={onNavigateToPublicJoin}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Test Checkout' : 'Tester le Checkout'}</span>
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-medium">{feedbackMsg}</span>
        </div>
      )}

      {/* Main Admin Wallet & Payout Hub Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950 border border-emerald-500/30 text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">{t('wapay.walletCardTitle', 'Portefeuille Administrateur')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {language === 'en' ? 'Ready for Payout' : 'Prêt à Décaisser'}
                </span>

                {kycProfile?.isVerified ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-blue-400" />
                    <span>{t('wapay.kycVerifiedBadge', 'KYC Vérifié')}</span>
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {language === 'en' ? 'Ceiling without KYC: 500 GH₵' : 'Plafond sans KYC : 500 GH₵'}
                  </span>
                )}

                {splitConfig?.enabled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    {t('wapay.splitActiveBadge', 'Split-Payment 98% Actif')}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {language === 'en' ? 'Group Balance & Payout Hub' : 'Solde & Décaissements des Groupes'}
              </h2>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowDestModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span>{language === 'en' ? 'Configure Account' : 'Configurer Compte'}</span>
            </button>

            <button
              onClick={() => {
                setPayoutError(null);
                setPayoutAmount('');
                setShowPayoutModal(true);
              }}
              disabled={!balanceData || balanceData.availableBalanceGHS <= 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>{t('wapay.requestPayoutBtn', 'Demander un Retrait')}</span>
            </button>
          </div>
        </div>

        {/* Balance Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          
          {/* Available to Withdraw */}
          <div className="p-4 rounded-xl bg-zinc-800/80 border border-emerald-500/40 backdrop-blur-xs relative overflow-hidden">
            <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{t('wapay.availableBalance', 'Solde Retirable')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {formatGHS(balanceData?.availableBalanceGHS || 0)}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
              <CheckCheck className="w-3 h-3 text-emerald-400" />
              <span>{language === 'en' ? 'Confirmed net funds available' : 'Fonds nets confirmés disponibles'}</span>
            </div>
          </div>

          {/* Total Already Withdrawn */}
          <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 backdrop-blur-xs">
            <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider mb-1">
              {language === 'en' ? 'Total Settled Payouts' : 'Total Déjà Retiré'}
            </div>
            <div className="text-2xl font-bold text-zinc-200">
              {formatGHS(balanceData?.totalWithdrawnGHS || 0)}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              {language === 'en' 
                ? `${payouts.filter(p => p.status === 'completed').length} successful payout(s)` 
                : `${payouts.filter(p => p.status === 'completed').length} virement(s) réussi(s)`}
            </div>
          </div>

          {/* Cumulative Net Revenue */}
          <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 backdrop-blur-xs">
            <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider mb-1">
              {language === 'en' ? 'Cumulative Net Revenue' : 'Revenus Nets Cumulés'}
            </div>
            <div className="text-2xl font-bold text-white">
              {formatGHS(balanceData?.totalNetRevenueGHS || 0)}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              {language === 'en' 
                ? `Gross volume: ${formatGHS(balanceData?.totalEarnedGrossGHS || 0)}` 
                : `Volume brut : ${formatGHS(balanceData?.totalEarnedGrossGHS || 0)}`}
            </div>
          </div>

          {/* Configured Destination Account */}
          <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 backdrop-blur-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>{language === 'en' ? 'Destination Account' : 'Compte de Réception'}</span>
                <span className="text-emerald-400 text-[10px] font-bold">{language === 'en' ? 'Active' : 'Actif'}</span>
              </div>
              {balanceData?.defaultPayoutDestination ? (
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    {balanceData.defaultPayoutDestination.channel === 'mobile_money' ? (
                      <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                    <span className="truncate">
                      {balanceData.defaultPayoutDestination.channel === 'mobile_money'
                        ? `${balanceData.defaultPayoutDestination.momoProvider?.toUpperCase()}`
                        : `${balanceData.defaultPayoutDestination.bankName}`}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-emerald-300">
                    {balanceData.defaultPayoutDestination.phoneNumber || balanceData.defaultPayoutDestination.accountNumber}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {language === 'en' ? 'Beneficiary: ' : 'Bénéficiaire : '}{balanceData.defaultPayoutDestination.accountName}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === 'en' ? 'No destination configured' : 'Aucun compte configuré'}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDestModal(true)}
              className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 self-start"
            >
              <span>{language === 'en' ? 'Edit payout destination' : 'Modifier les coordonnées'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'wallet'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>{language === 'en' ? `Payouts & Withdrawals (${payouts.length})` : `Retraits & Versements (${payouts.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'transactions'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{language === 'en' ? `Subscription Ledger (${transactions.length})` : `Registre des Souscriptions (${transactions.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('connectors')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'connectors'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{language === 'en' ? `Live Connectors (${providers.length})` : `Connecteurs Réels (${providers.length})`}</span>
        </button>
      </div>

      {/* TAB 1: Payouts & Withdrawals History */}
      {activeTab === 'wallet' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                  <span>Historique des Décaissements Administrateur</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Virements effectués vers votre portefeuille Mobile Money ou compte bancaire
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPayoutError(null);
                    setPayoutAmount('');
                    setShowPayoutModal(true);
                  }}
                  disabled={!balanceData || balanceData.availableBalanceGHS <= 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Nouveau Retrait</span>
                </button>
              </div>
            </div>

            {payouts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">Aucun retrait effectué pour le moment</p>
                <p className="text-[11px] mt-1">Votre solde disponible s'accumule automatiquement lors des adhésions de vos membres.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Réf Retrait</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3">Montant Brut</th>
                      <th className="py-2.5 px-3">Frais Réseau</th>
                      <th className="py-2.5 px-3">Net Reçu</th>
                      <th className="py-2.5 px-3 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {payouts.map((payout) => {
                      const isCompleted = payout.status === 'completed';
                      const isPending = payout.status === 'pending' || payout.status === 'processing';
                      return (
                        <tr key={payout.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/60">
                          <td className="py-3 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                            {payout.reference}
                          </td>
                          <td className="py-3 px-3 text-zinc-500 whitespace-nowrap">
                            {formatDateFR(payout.requestedAt)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                              {payout.destination.channel === 'mobile_money' ? (
                                <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              <span>
                                {payout.destination.channel === 'mobile_money' 
                                  ? `${payout.destination.momoProvider?.toUpperCase()} (${payout.destination.phoneNumber})` 
                                  : `${payout.destination.bankName} (${payout.destination.accountNumber})`}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {payout.destination.accountName}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatGHS(payout.amount)}
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-500">
                            {formatGHS(payout.fee)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatGHS(payout.netAmount)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : isPending
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                              <span>{isCompleted ? 'Viré avec Succès' : isPending ? 'En Traitement' : 'Échec'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Subscriptions Ledger & Transactions */}
      {activeTab === 'transactions' && (
        <div className="space-y-5">
          {/* KPI Financial Overview Cards */}
          {settlement && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Gross Volume */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Volume Brut</span>
                  <Coins className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {formatGHS(settlement.totalGrossVolumeGHS)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  {settlement.transactionsCount.verified} transactions confirmées
                </div>
              </div>

              {/* Net Settlement */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-900 text-white shadow-md shadow-emerald-950/20">
                <div className="flex items-center justify-between text-emerald-200 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Règlements Nets</span>
                  <Building2 className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">
                  {formatGHS(settlement.totalNetSettledGHS)}
                </div>
                <div className="text-[10px] text-emerald-200/80 mt-1">
                  Montant net reversé au marchand
                </div>
              </div>

              {/* Operator Fees */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Frais Opérateurs</span>
                  <Smartphone className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {formatGHS(settlement.totalOperatorFeesGHS)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  ~1.5% déduit pour réseaux MoMo/Cartes
                </div>
              </div>

              {/* Platform Fees */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Commissions SBI Pay</span>
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {formatGHS(settlement.totalPlatformFeesGHS)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  1.0% gestion et sécurité
                </div>
              </div>

              {/* Pending Volume */}
              <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">En Attente</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                  {formatGHS(settlement.totalPendingSettlementGHS)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  {settlement.transactionsCount.pending} prompt(s) en cours de validation
                </div>
              </div>
            </div>
          )}

          {/* Multicurrency & Country Distribution */}
          {settlement && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Devises Débitées */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Répartition par Devise</span>
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(settlement.currencyBreakdown).map(([curr, data]) => (
                    <div key={curr} className="flex items-center justify-between text-xs">
                      <span className="font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {curr}
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-bold">{data.volume.toLocaleString()} {curr}</span>
                        <span className="text-[10px] text-zinc-500 block">≈ {formatGHS(data.volumeGHS)} ({data.count} tx)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pays Clients */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Marchés Clients Africains</span>
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(settlement.countryBreakdown).map(([country, data]) => {
                    const flagMap: Record<string, string> = {
                      GH: '🇬🇭 Ghana',
                      CI: '🇨🇮 Côte d\'Ivoire',
                      SN: '🇸🇳 Sénégal',
                      CM: '🇨🇲 Cameroun',
                      NG: '🇳🇬 Nigeria',
                      KE: '🇰🇪 Kenya'
                    };
                    return (
                      <div key={country} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {flagMap[country] || country}
                        </span>
                        <div className="text-right">
                          <span className="font-mono font-bold">{formatGHS(data.volumeGHS)}</span>
                          <span className="text-[10px] text-zinc-500 block">{data.count} tx</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Opérateurs et Passerelles */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                  <span>Réseaux Opérateurs Utilisés</span>
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(settlement.operatorBreakdown).map(([op, data]) => (
                    <div key={op} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[140px]">
                        {op}
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-bold">{formatGHS(data.volumeGHS)}</span>
                        <span className="text-[10px] text-zinc-500 block">{data.count} tx</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Ledger */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Registre Financier des Souscriptions SBI Pay</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Historique auditable, clés d'idempotence et vérification serveur
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Chercher référence, client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="verified">Vérifiés (Confirmés)</option>
                  <option value="pending">En attente (Pending)</option>
                  <option value="failed">Échoués (Failed)</option>
                  <option value="refunded">Remboursés (Refunded)</option>
                </select>

                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                >
                  <option value="all">Toutes devises</option>
                  <option value="GHS">GHS (Ghana)</option>
                  <option value="XOF">XOF (UEMOA)</option>
                  <option value="XAF">XAF (CEMAC)</option>
                  <option value="NGN">NGN (Nigeria)</option>
                  <option value="KES">KES (Kenya)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Référence</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Montant Débité</th>
                    <th className="py-2.5 px-3">Net Reçu (GHS)</th>
                    <th className="py-2.5 px-3">Moyen / Passerelle</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500">
                        Aucune transaction trouvée.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isVerified = tx.status === 'verified';
                      const isPending = tx.status === 'pending';
                      const isRefunded = tx.status === 'refunded';

                      return (
                        <tr key={tx.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/60">
                          <td className="py-3 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center gap-1.5">
                              <span>{tx.reference}</span>
                              <button
                                onClick={() => handleCopy(tx.reference)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                title="Copier la référence"
                              >
                                {copiedRef === tx.reference ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            {tx.isSandbox && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                                Sandbox
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-zinc-500 whitespace-nowrap">
                            {formatDateFR(tx.createdAt)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{tx.customer.name}</div>
                            <div className="text-[10px] text-zinc-400">{tx.customer.phone} ({tx.customer.country})</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold">
                              {tx.pricing.chargedAmount} {tx.pricing.chargedCurrency}
                            </span>
                            {tx.pricing.chargedCurrency !== 'GHS' && (
                              <span className="text-[10px] text-zinc-500 block">
                                (tx: {tx.pricing.exchangeRate})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatGHS(tx.pricing.netSettlementAmountGHS)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200">
                              {tx.operatorNetwork || tx.channel}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              via {tx.providerId}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isVerified 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : isPending
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : isRefunded
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {isVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                              {isRefunded && <RotateCcw className="w-3 h-3 text-purple-600" />}
                              <span>{tx.status.toUpperCase()}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <button
                                  onClick={() => handleVerifyDirect(tx.reference)}
                                  className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300"
                                  title="Interroger la passerelle pour vérifier le statut réel"
                                >
                                  Vérifier
                                </button>
                              )}
                              {isVerified && !isRefunded && (
                                <button
                                  onClick={() => {
                                    setRefundTarget(tx);
                                    setRefundReason('');
                                    setRefundError(null);
                                  }}
                                  className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-[10px] font-semibold text-rose-700 dark:text-rose-300 border border-rose-200/50"
                                  title="Initier un remboursement officiel"
                                >
                                  Rembourser
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Connectors Matrix & Regulatory Overview */}
      {activeTab === 'connectors' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Matrice d'Intégration des Connecteurs SBI Pay</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Statuts réels des connexions aux passerelles et exigences contractuelles marchandes
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {providers.length} connecteurs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {providers.map((p) => {
              const isLive = p.status === 'LIVE_OPERATIONAL';
              const isSandbox = p.status === 'SANDBOX_ACTIVE';

              return (
                <div 
                  key={p.id}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {p.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLive 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isSandbox
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {isLive ? 'Live Connecté' : isSandbox ? 'Sandbox Actif' : 'Contrat Requis'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2 leading-relaxed">
                      {p.contractRequirement}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[10px] flex items-center justify-between text-zinc-500">
                    <span>Devises : {p.currencies?.join(', ')}</span>
                    <span>Pays : {p.countries?.join(', ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payout Withdrawal Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center gap-3 text-emerald-600">
              <ArrowDownToLine className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Demande de Retrait Administrateur
                </h3>
                <p className="text-xs text-zinc-500">
                  Transférez vos gains vers votre compte Mobile Money ou Banque
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs flex justify-between items-center">
              <div>
                <span className="text-emerald-700 dark:text-emerald-400 block text-[11px]">Solde Disponible au Retrait</span>
                <span className="font-black text-base text-emerald-800 dark:text-emerald-300">
                  {formatGHS(balanceData?.availableBalanceGHS || 0)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPayoutAmount((balanceData?.availableBalanceGHS || 0).toString())}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              >
                Tout Retirer
              </button>
            </div>

            {/* Configured Destination Info */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] font-bold uppercase">Compte de Réception :</span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {balanceData?.defaultPayoutDestination?.channel === 'mobile_money'
                    ? `${balanceData.defaultPayoutDestination.momoProvider?.toUpperCase()} (${balanceData.defaultPayoutDestination.phoneNumber})`
                    : `${balanceData?.defaultPayoutDestination?.bankName} (${balanceData?.defaultPayoutDestination?.accountNumber})`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowPayoutModal(false);
                    setShowDestModal(true);
                  }}
                  className="text-emerald-600 hover:underline text-[11px] font-semibold"
                >
                  Changer
                </button>
              </div>
              <div className="text-[10px] text-zinc-500">
                Titulaire : {balanceData?.defaultPayoutDestination?.accountName}
              </div>
            </div>

            {payoutError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                {payoutError}
              </div>
            )}

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Montant à retirer (GH₵) :
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-xs">
                    GH₵
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="5"
                    max={balanceData?.availableBalanceGHS || 0}
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Ex : 100.00"
                    className="w-full pl-12 pr-3 py-2 rounded-xl text-sm font-mono font-bold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[25, 50, 100].map(pct => {
                    const max = balanceData?.availableBalanceGHS || 0;
                    const val = ((max * pct) / 100).toFixed(2);
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPayoutAmount(val)}
                        className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300"
                      >
                        {pct}% ({val} GH₵)
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Fee Calculation */}
              {payoutAmount && !isNaN(parseFloat(payoutAmount)) && parseFloat(payoutAmount) > 0 && (
                <div className="p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 text-[11px] space-y-1">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Montant demandé :</span>
                    <span className="font-mono font-bold">{parseFloat(payoutAmount).toFixed(2)} GH₵</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Frais de transfert télécom (1% min 1.00 GHS) :</span>
                    <span className="font-mono text-amber-600 font-bold">
                      -{Math.max(1.0, Math.round(parseFloat(payoutAmount) * 0.01 * 100) / 100).toFixed(2)} GH₵
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                    <span>Net crédité sur votre compte :</span>
                    <span className="font-mono text-sm">
                      {Math.max(0, parseFloat(payoutAmount) - Math.max(1.0, Math.round(parseFloat(payoutAmount) * 0.01 * 100) / 100)).toFixed(2)} GH₵
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={payoutLoading || !payoutAmount || parseFloat(payoutAmount) <= 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{payoutLoading ? 'Traitement en cours...' : 'Confirmer le Retrait'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Destination Configuration Modal */}
      {showDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center gap-3 text-emerald-600">
              <Sliders className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Coordonnées de Retrait des Fonds
                </h3>
                <p className="text-xs text-zinc-500">
                  Définissez le compte Mobile Money ou bancaire où verser vos revenus
                </p>
              </div>
            </div>

            {destError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                {destError}
              </div>
            )}

            <form onSubmit={handleSaveDestination} className="space-y-4 text-xs">
              
              {/* Channel Selector */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Type de Réception :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestChannel('mobile_money')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                      destChannel === 'mobile_money'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Mobile Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestChannel('bank_transfer')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                      destChannel === 'bank_transfer'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Compte Bancaire</span>
                  </button>
                </div>
              </div>

              {/* Country Selection */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Pays du compte :
                </label>
                <select
                  value={destCountry}
                  onChange={(e) => setDestCountry(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium"
                >
                  <option value="GH">🇬🇭 Ghana (GHS)</option>
                  <option value="CI">🇨🇮 Côte d'Ivoire (XOF)</option>
                  <option value="SN">🇸🇳 Sénégal (XOF)</option>
                  <option value="CM">🇨🇲 Cameroun (XAF)</option>
                  <option value="NG">🇳🇬 Nigeria (NGN)</option>
                  <option value="KE">🇰🇪 Kenya (KES)</option>
                </select>
              </div>

              {destChannel === 'mobile_money' ? (
                <>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Opérateur Mobile Money :
                    </label>
                    <select
                      value={destMomoProvider}
                      onChange={(e) => setDestMomoProvider(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium"
                    >
                      <option value="MTN MoMo">MTN Mobile Money (MoMo)</option>
                      <option value="Telecel Cash">Telecel Cash (ex Vodafone)</option>
                      <option value="AirtelTigo Money">AirtelTigo Money</option>
                      <option value="Wave">Wave Mobile Money</option>
                      <option value="Orange Money">Orange Money</option>
                      <option value="Moov Money">Moov Africa Money</option>
                      <option value="M-Pesa">Safaricom M-Pesa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Numéro de téléphone du portefeuille :
                    </label>
                    <input
                      type="tel"
                      required
                      value={destPhoneNumber}
                      onChange={(e) => setDestPhoneNumber(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full p-2.5 rounded-xl font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Nom de la Banque :
                    </label>
                    <input
                      type="text"
                      required
                      value={destBankName}
                      onChange={(e) => setDestBankName(e.target.value)}
                      placeholder="Ex : GCB Bank, Ecobank, Zenith Bank..."
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Numéro de Compte / IBAN :
                    </label>
                    <input
                      type="text"
                      required
                      value={destAccountNumber}
                      onChange={(e) => setDestAccountNumber(e.target.value)}
                      placeholder="Ex : 1010023456789"
                      className="w-full p-2.5 rounded-xl font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom officiel complet du titulaire (identique à l'opérateur/banque) :
                </label>
                <input
                  type="text"
                  required
                  value={destAccountName}
                  onChange={(e) => setDestAccountName(e.target.value)}
                  placeholder="Ex : Kwame Mensah"
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={destLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  {destLoading ? 'Enregistrement...' : 'Enregistrer le Compte'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center gap-3 text-rose-600">
              <RotateCcw className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Remboursement de Transaction
                </h3>
                <p className="text-xs text-zinc-500">
                  {refundTarget.reference} • {refundTarget.customer.name}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Montant débité :</span>
                <span className="font-bold">{refundTarget.pricing.chargedAmount} {refundTarget.pricing.chargedCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Net commerçant :</span>
                <span className="font-bold text-emerald-600">{formatGHS(refundTarget.pricing.netSettlementAmountGHS)}</span>
              </div>
            </div>

            {refundError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                {refundError}
              </div>
            )}

            <form onSubmit={handleConfirmRefund} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Motif officiel du remboursement (requis pour audit) :
                </label>
                <textarea
                  required
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Ex : Erreur de souscription du client, demande de rétractation validée sous 24h..."
                  className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={refundLoading || !refundReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                >
                  {refundLoading ? 'Traitement...' : 'Confirmer le Remboursement'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
