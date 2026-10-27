import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  CreditCard, 
  ArrowRight, 
  ExternalLink, 
  Sparkles, 
  AlertCircle,
  FlaskConical,
  Clock,
  CheckCircle2,
  Lock,
  Tag,
  Printer,
  Copy,
  Globe,
  MapPin,
  ChevronDown,
  Building2,
  RefreshCw
} from 'lucide-react';
import { Group, Plan } from '../types/index.ts';
import { formatMoney, formatGHS } from '../utils/formatters.ts';
import { 
  SUPPORTED_CURRENCIES, 
  convertFromGHS, 
  detectUserGeoAndCurrency, 
  DetectedGeoInfo,
  CurrencyConfig 
} from '../utils/currency.ts';
import { ReceiptModal } from './ReceiptModal.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface PublicJoinViewProps {
  groups: Group[];
  plans: Plan[];
  preselectedGroupId?: string;
  onPaymentSuccess?: (paymentData: any) => void;
  isSandboxMode: boolean;
}

export const PublicJoinView: React.FC<PublicJoinViewProps> = ({
  groups,
  plans,
  preselectedGroupId,
  onPaymentSuccess,
  isSandboxMode
}) => {
  const { t, language } = useLanguage();
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    preselectedGroupId || groups[0]?.id || ''
  );

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const groupPlans = plans.filter((p) => p.groupId === selectedGroup?.id && p.isActive);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(groupPlans[0]?.id || '');

  // Geo-location & Multi-currency States
  const [detectedGeo, setDetectedGeo] = useState<DetectedGeoInfo | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string>('GHS');
  const [isDetectingGeo, setIsDetectingGeo] = useState(true);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+233 ');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentChannel, setPaymentChannel] = useState<'mobile_money' | 'card' | 'bank'>('mobile_money');
  const [momoNetwork, setMomoNetwork] = useState<string>('mtn');

  // Affiliate referral state
  const [affiliateRef, setAffiliateRef] = useState<string | null>(null);

  // Promo code states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Receipt Modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Suggestion 3: Recurring auto-renew option
  const [isAutoRenew, setIsAutoRenew] = useState(false);
  // Suggestion 6: STK Push Countdown Timer
  const [countdown, setCountdown] = useState(60);

  // Automatic Geo & Currency Detection on Mount
  useEffect(() => {
    let isMounted = true;
    setIsDetectingGeo(true);
    detectUserGeoAndCurrency()
      .then((geo) => {
        if (!isMounted) return;
        setDetectedGeo(geo);
        setCurrencyCode(geo.currency);
        // Pre-fill phone dialing code with detected country
        setCustomerPhone((prev) => {
          if (!prev || prev.trim() === '+233' || prev.trim() === '+' || prev === '+233 ') {
            return `${geo.dialCode} `;
          }
          return prev;
        });
        // Select first momo provider of detected currency if available
        const conf = SUPPORTED_CURRENCIES[geo.currency];
        if (conf?.momoProviders && conf.momoProviders.length > 0) {
          setMomoNetwork(conf.momoProviders[0].id);
        } else if (conf?.paymentChannels.includes('card')) {
          setPaymentChannel('card');
        }
      })
      .catch((err) => console.warn('Geo detection notice:', err))
      .finally(() => {
        if (isMounted) setIsDetectingGeo(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle manual currency selection
  const handleSelectCurrency = (code: string) => {
    const config = SUPPORTED_CURRENCIES[code];
    if (!config) return;
    setCurrencyCode(code);
    try {
      localStorage.setItem('wtm_user_currency', code);
    } catch (e) {}

    // Update phone dial code prefix smoothly
    setCustomerPhone((prev) => {
      // If empty or only contains a previous dial code, set new dial code
      if (!prev || prev.trim().length <= 5 || prev.startsWith('+')) {
        const remainingDigits = prev.replace(/^\+\d+\s*/, '').trim();
        return remainingDigits ? `${config.dialCode} ${remainingDigits}` : `${config.dialCode} `;
      }
      return `${config.dialCode} ${prev}`;
    });

    // Adapt payment channel
    if (config.paymentChannels.includes(paymentChannel as any)) {
      if (paymentChannel === 'mobile_money' && config.momoProviders && config.momoProviders.length > 0) {
        setMomoNetwork(config.momoProviders[0].id);
      }
    } else {
      setPaymentChannel(config.paymentChannels[0] || 'card');
      if (config.momoProviders && config.momoProviders.length > 0) {
        setMomoNetwork(config.momoProviders[0].id);
      }
    }

    setShowCurrencyDropdown(false);
  };

  // Detect affiliate referral code from URL parameters or hash
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    let refCode = urlParams.get('ref');
    if (!refCode && hash.includes('ref=')) {
      const match = hash.match(/ref=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) refCode = match[1];
    }
    if (refCode) {
      setAffiliateRef(refCode.toUpperCase());
    }
  }, []);

  // Transaction States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [initiatedTx, setInitiatedTx] = useState<{
    reference: string;
    checkoutUrl?: string;
    provider: string;
    isSandbox: boolean;
    currency?: string;
  } | null>(null);

  const [verifiedSuccess, setVerifiedSuccess] = useState<{
    activation: any;
    verification?: any;
    oneTimeToken?: string;
    oneTimeAccessUrl?: string;
    oneTimeAppUrl?: string;
    waInviteMessage?: string;
    waClickToChat?: string;
  } | null>(null);

  // Suggestion 6: STK Push Countdown Timer effect
  useEffect(() => {
    let timer: any = null;
    if (initiatedTx && !verifiedSuccess) {
      setCountdown(60);
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [initiatedTx, verifiedSuccess]);

  // Sync selectedPlanId when group changes
  useEffect(() => {
    if (groupPlans.length > 0 && !groupPlans.some(p => p.id === selectedPlanId)) {
      setSelectedPlanId(groupPlans[0].id);
    }
  }, [selectedGroupId, groupPlans]);

  const activePlan = plans.find((p) => p.id === selectedPlanId) || groupPlans[0];
  const activeCurrencyConfig: CurrencyConfig = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.GHS;

  // Base pricing in GHS converted to selected/detected local currency
  const basePriceGHS = activePlan?.price || 0;
  const convertedOriginalPrice = convertFromGHS(basePriceGHS, currencyCode);

  // Calculate pricing with promo discount
  const discountAmount = appliedPromo 
    ? (appliedPromo.discountType === 'percentage' 
        ? Math.round((convertedOriginalPrice * appliedPromo.discountValue) / 100) 
        : convertFromGHS(appliedPromo.discountValue, currencyCode))
    : 0;

  const finalPrice = Math.max(0, convertedOriginalPrice - discountAmount);

  // Validate Promo Code
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoError(null);
    setIsApplyingPromo(true);

    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          amount: basePriceGHS
        })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedPromo({
          code: data.code,
          discountType: data.discountType || data.type,
          discountValue: data.discountValue,
          discountAmount: data.discountAmount ?? data.discountAmountGHS ?? 0
        });
      } else {
        setPromoError(data.error || 'Code promo invalide ou expiré.');
        setAppliedPromo(null);
      }
    } catch (e: any) {
      setPromoError('Impossible de valider le code promo.');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleInitiate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Veuillez renseigner votre nom complet.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 8) {
      setErrorMsg(`Veuillez entrer un numéro WhatsApp valide avec indicatif (ex: ${activeCurrencyConfig.dialCode} ...).`);
      return;
    }
    if (!activePlan) {
      setErrorMsg('Veuillez choisir une formule d\'adhésion.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: selectedGroup.adminId,
          groupId: selectedGroup.id,
          planId: activePlan.id,
          amount: finalPrice,
          currency: currencyCode,
          originalAmountGHS: basePriceGHS,
          country: activeCurrencyConfig.countryName,
          promoCode: appliedPromo?.code,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          channel: paymentChannel,
          momoNetwork: paymentChannel === 'mobile_money' ? momoNetwork : undefined,
          provider: isSandboxMode ? 'sandbox' : 'paystack',
          isRecurring: isAutoRenew,
          recurringInterval: 'monthly',
          callbackUrl: window.location.href
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'initiation du paiement");
      }

      setInitiatedTx(data);

      // If it has an external checkout URL (like Paystack live popup/redirect)
      if (data.checkoutUrl && !data.isSandbox && !data.checkoutUrl.startsWith('/')) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Échec de connexion au serveur de paiement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sandbox Test Trigger: simulate success on server and verify
  const handleSimulateSandboxSuccess = async () => {
    if (!initiatedTx) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Tell sandbox server to mark reference as verified
      const simRes = await fetch('/api/payments/sandbox/simulate-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: initiatedTx.reference })
      });
      const simData = await simRes.json();
      if (!simRes.ok) throw new Error(simData.error || 'Erreur simulation sandbox');

      // 2. Authoritatively verify with server
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: initiatedTx.reference,
          provider: 'sandbox',
          planDurationDays: activePlan?.durationDays || 30,
          groupName: selectedGroup?.name || 'Groupe VIP',
          accessInstructions: selectedGroup?.accessInstructions || '',
          inviteLink: selectedGroup?.inviteLink || '',
          adminId: selectedGroup.adminId,
          groupId: selectedGroup.id
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.verified) {
        throw new Error(verifyData.message || 'La vérification du paiement a échoué.');
      }

      setVerifiedSuccess(verifyData);

      // Record affiliate commission if client entered with an affiliate ref link
      if (affiliateRef) {
        fetch('/api/affiliate/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            affiliateCode: affiliateRef,
            customerName: customerName.trim(),
            amount: finalPrice
          })
        }).catch(err => console.warn('Affiliate record failed:', err));
      }

      if (onPaymentSuccess) {
        onPaymentSuccess(verifyData);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to form
  const handleReset = () => {
    setInitiatedTx(null);
    setVerifiedSuccess(null);
    setCustomerName('');
    setErrorMsg('');
    setAppliedPromo(null);
    setPromoCodeInput('');
  };

  if (!selectedGroup) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <MessageCircle className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
        <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Aucun groupe disponible</h3>
        <p className="text-xs text-zinc-500 mt-1">Veuillez d'abord créer un groupe WhatsApp depuis le tableau de bord administrateur.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-8">
      
      {/* Mobile Device Friendly Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl transition-all">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white p-6 sm:p-8 relative rounded-t-3xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs">
              {selectedGroup.category || (language === 'en' ? 'VIP WhatsApp Access' : 'Accès WhatsApp VIP')}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-400/20">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{language === 'en' ? 'Multi-Currency Secure Checkout' : 'Paiement Sécurisé Multi-Devises'}</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {selectedGroup.name}
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 mt-2 line-clamp-3">
            {selectedGroup.description || (language === 'en' ? 'Join our exclusive WhatsApp community.' : 'Rejoignez notre communauté WhatsApp exclusive.')}
          </p>

          {/* Group Selector if multiple */}
          {groups.length > 1 && !preselectedGroupId && (
            <div className="mt-4 pt-3 border-t border-white/20">
              <label className="text-[11px] text-emerald-200 block mb-1">
                {language === 'en' ? 'Select another group:' : 'Choisir un autre groupe :'}
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full text-xs bg-white/10 text-white rounded-lg px-2.5 py-1.5 border border-white/20 focus:outline-none"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id} className="text-zinc-900">{g.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* State 1: SUCCESS VERIFIED SCREEN */}
        {verifiedSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {language === 'en' ? `Payment Verified Successfully (${currencyCode})` : `Paiement Vérifié avec Succès (${currencyCode})`}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                {t('checkout.congratsTitle', 'Félicitations, vous êtes membre !')}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto">
                {t('checkout.congratsSub', "Votre adhésion a été validée par notre serveur. Votre lien d'accès WhatsApp à usage unique a été généré.")}
              </p>
            </div>

            {/* CRITICAL: ONE-TIME ACCESS LINK / AUTODESTRUCTION NOTICE */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-left space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{t('checkout.oneTimeNoticeTitle', "Lien d'Accès Sécurisé à Usage Unique :")}</span>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                {t('checkout.oneTimeNoticeBody', '⚠️ Important : Dès que vous cliquez sur le lien ci-dessous une fois, il ne fonctionnera plus. Ne le partagez avec personne !')}
              </p>
              {verifiedSuccess.oneTimeAccessUrl && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700/50 text-[11px] font-mono break-all">
                  <span className="flex-1 truncate">{verifiedSuccess.oneTimeAccessUrl}</span>
                  <button
                    onClick={() => {
                      if (verifiedSuccess.oneTimeAccessUrl) {
                        navigator.clipboard.writeText(verifiedSuccess.oneTimeAccessUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 shrink-0 hover:bg-zinc-200 transition-colors"
                    title={language === 'en' ? 'Copy single-use link' : 'Copier le lien unique'}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Single-Use Action Button */}
            <a
              href={verifiedSuccess.oneTimeAccessUrl || selectedGroup.inviteLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 transition-transform hover:scale-[1.02]"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{t('checkout.openWhatsAppBtn', 'Ouvrir mon Lien Unique & Intégrer le Groupe')}</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Access Instructions Box */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl p-5 text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{t('checkout.adminInstructionsTitle', "Instructions de l'Administrateur :")}</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                {verifiedSuccess.activation?.instructions || selectedGroup.accessInstructions}
              </p>
            </div>

            {/* Actions: Receipt and reset */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowReceiptModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition-colors"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>{t('checkout.downloadReceiptBtn', 'Télécharger / Imprimer mon Reçu Officiel (PDF)')}</span>
              </button>

              <button
                onClick={handleReset}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline block"
              >
                {t('checkout.anotherSubBtn', 'Effectuer une autre souscription')}
              </button>
            </div>

          </div>
        ) : initiatedTx ? (
          /* State 2: TRANSACTION INITIATED / STK PUSH COUNTDOWN */
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Interactive STK Push Header & Countdown */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950 border border-emerald-500/40 text-white shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {initiatedTx.isSandbox 
                    ? (language === 'en' ? 'Sandbox Test Mode Active' : 'Test Sandbox Actif') 
                    : (language === 'en' ? 'USSD Prompt Sent' : 'Invite USSD Transmise')}
                </span>

                <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                  <Clock className={`w-4 h-4 ${countdown < 15 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
                  <span className={countdown < 15 ? 'text-rose-400' : 'text-emerald-300'}>
                    00:{countdown < 10 ? `0${countdown}` : countdown}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t('checkout.stkPushTitle', "Vérifiez l'écran de votre téléphone")}
                  </h3>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    {language === 'en' 
                      ? <>A debit prompt of <strong className="text-emerald-400">{formatMoney(finalPrice, currencyCode)}</strong> has been sent to <strong className="font-mono text-white">{customerPhone}</strong>.</>
                      : <>Une demande de débit de <strong className="text-emerald-400">{formatMoney(finalPrice, currencyCode)}</strong> a été envoyée vers le numéro <strong className="font-mono text-white">{customerPhone}</strong>.</>}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-4 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${countdown < 15 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${(countdown / 60) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold mb-1.5">1</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">{language === 'en' ? 'USSD Prompt' : 'Invite USSD'}</span>
                <span className="text-[11px] text-zinc-500">
                  {language === 'en' ? 'Accept the prompt or dial carrier code on your mobile.' : "Acceptez l'invite ou composez le code opérateur sur votre mobile."}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold mb-1.5">2</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">{language === 'en' ? 'Secret PIN Code' : 'Code PIN Secret'}</span>
                <span className="text-[11px] text-zinc-500">
                  {language === 'en' ? 'Enter your confidential Mobile Money PIN.' : 'Saisissez votre code PIN Mobile Money confidentiel.'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold mb-1.5">3</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">{language === 'en' ? 'Confirmation' : 'Confirmation'}</span>
                <span className="text-[11px] text-zinc-500">
                  {language === 'en' ? 'Your subscription and WhatsApp link unlock instantly.' : "Votre adhésion et votre accès WhatsApp s'activent instantanément."}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            {/* Validation Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={handleSimulateSandboxSuccess}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? (language === 'en' ? 'Verifying with carrier...' : "Vérification auprès de l'opérateur...") 
                    : t('checkout.iPaidBtn', "J'ai validé mon code PIN (Confirmer)")}
                </span>
              </button>

              <button
                onClick={() => handleInitiate()}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('checkout.resendUssdBtn', "Renvoyer l'invite USSD sur mon mobile")}</span>
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 underline"
            >
              {t('checkout.cancelChooseOther', 'Annuler et choisir un autre moyen')}
            </button>
          </div>
        ) : (
          /* State 3: REGISTRATION & PLAN SELECTION FORM */
          <form onSubmit={handleInitiate} className="p-6 sm:p-8 space-y-6">
            
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* LOCATION & MULTI-CURRENCY DETECTION BAR */}
            <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-zinc-50 dark:from-emerald-950/30 dark:via-zinc-800/60 dark:to-zinc-800/40 border border-emerald-200/70 dark:border-emerald-800/40 rounded-2xl p-3.5 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 text-lg shrink-0">
                    {activeCurrencyConfig.flag}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      <span>{activeCurrencyConfig.countryName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-mono font-black tracking-wide">
                        {activeCurrencyConfig.code} ({activeCurrencyConfig.symbol})
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      {isDetectingGeo ? (
                        <span>{language === 'en' ? 'Detecting your geographical zone...' : 'Détection de votre zone géographique...'}</span>
                      ) : (
                        <span>
                          {detectedGeo?.source === 'stored'
                            ? (language === 'en' ? 'Stored custom currency' : 'Devise personnalisée mémorisée')
                            : detectedGeo?.source === 'network'
                            ? (language === 'en' ? 'Auto-detected by IP location' : 'Localisation IP détectée automatiquement')
                            : detectedGeo?.source === 'timezone'
                            ? (language === 'en' ? 'Detected from device timezone' : 'Localisation fuseau horaire détectée')
                            : (language === 'en' ? 'Default currency' : 'Devise par défaut')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-xs transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'en' ? 'Change currency' : 'Changer de devise'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showCurrencyDropdown && (
                    <>
                      {/* Click outside backdrop */}
                      <div 
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs" 
                        onClick={() => setShowCurrencyDropdown(false)} 
                      />

                      <div className="absolute left-0 right-0 sm:left-auto sm:right-0 top-full mt-2 w-full sm:w-80 max-h-80 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5">
                          {language === 'en' ? 'Select your country / currency:' : 'Sélectionner votre pays / devise :'}
                        </div>
                        {Object.values(SUPPORTED_CURRENCIES).map((c) => {
                          const isCurSelected = c.code === currencyCode;
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => handleSelectCurrency(c.code)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                                isCurSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-500/30'
                                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xl shrink-0 leading-none inline-flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs select-none">
                                  {c.flag}
                                </span>
                                <div className="min-w-0">
                                  <div className="leading-tight font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                    {c.countryName}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                    {c.code} • {language === 'en' ? 'Dial' : 'Indicatif'} {c.dialCode}
                                  </div>
                                </div>
                              </div>
                              <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                                {c.symbol}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 1. Choose Plan */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                {t('checkout.step1', "1. Choisissez votre formule d'adhésion :")}
              </label>

              {groupPlans.length === 0 ? (
                <div className="text-xs text-zinc-500 p-4 rounded-xl border border-dashed border-zinc-300">
                  {language === 'en' ? 'No active plans for this group currently.' : 'Aucune formule active pour ce groupe actuellement.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {groupPlans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const convertedPlanPrice = convertFromGHS(plan.price, currencyCode);

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                              {plan.name}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {language === 'en' ? `Full access ${plan.durationDays} days` : `Accès complet ${plan.durationDays} jours`}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {formatMoney(convertedPlanPrice, currencyCode)}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {currencyCode !== 'GHS' 
                              ? `(${language === 'en' ? 'Ref.' : 'Réf.'} ${formatMoney(plan.price, 'GHS')})` 
                              : 'GHS Cedi'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Member Information */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {t('checkout.step2', '2. Vos Coordonnées :')}
              </label>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('checkout.fullNameLabel', 'Nom complet ou Pseudo *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('checkout.fullNamePlaceholder', 'Ex: Kofi Mensah')}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {language === 'en' ? `WhatsApp Number (${activeCurrencyConfig.countryName} ${activeCurrencyConfig.dialCode}) *` : `Numéro WhatsApp (${activeCurrencyConfig.countryName} ${activeCurrencyConfig.dialCode}) *`}
                </label>
                <input
                  type="tel"
                  required
                  placeholder={`${activeCurrencyConfig.dialCode} ...`}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {language === 'en' ? 'This number receives your invitation and identifies your profile in the WhatsApp group.' : "Ce numéro servira à vous envoyer l'invitation et à identifier votre profil dans le groupe."}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('checkout.emailLabel', 'Adresse e-mail (Optionnelle pour reçu)')}
                </label>
                <input
                  type="email"
                  placeholder="nom@exemple.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {t('checkout.step3', '3. Moyen de paiement :')}
              </label>

              <div className="grid grid-cols-2 gap-3">
                {activeCurrencyConfig.paymentChannels.includes('mobile_money') && (
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('mobile_money')}
                    className={`p-3 rounded-xl border-2 text-left flex items-center gap-2.5 transition-all ${
                      paymentChannel === 'mobile_money'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Mobile Money</div>
                      <div className="text-[10px] text-zinc-500">
                        {activeCurrencyConfig.momoProviders?.slice(0, 2).map(p => p.name.split(' ')[0]).join(' / ') || 'MoMo Local'}
                      </div>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPaymentChannel('card')}
                  className={`p-3 rounded-xl border-2 text-left flex items-center gap-2.5 transition-all ${
                    paymentChannel === 'card'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">{language === 'en' ? 'Credit / Debit Card' : 'Carte Bancaire'}</div>
                    <div className="text-[10px] text-zinc-500">Visa / Mastercard</div>
                  </div>
                </button>

                {activeCurrencyConfig.paymentChannels.includes('bank') && (
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('bank')}
                    className={`col-span-2 p-3 rounded-xl border-2 text-left flex items-center gap-2.5 transition-all ${
                      paymentChannel === 'bank'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">{language === 'en' ? 'Bank Transfer / USSD' : 'Virement Bancaire / USSD'}</div>
                      <div className="text-[10px] text-zinc-500">{language === 'en' ? 'Local banks & virtual accounts' : 'Banques locales & comptes virtuels'}</div>
                    </div>
                  </button>
                )}
              </div>

              {/* Mobile Money Network Choice */}
              {paymentChannel === 'mobile_money' && activeCurrencyConfig.momoProviders && activeCurrencyConfig.momoProviders.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
                    {language === 'en' ? `Select your carrier (${activeCurrencyConfig.countryName}):` : `Sélectionnez votre opérateur (${activeCurrencyConfig.countryName}) :`}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {activeCurrencyConfig.momoProviders.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setMomoNetwork(provider.id)}
                        className={`py-2 px-2.5 rounded-lg font-bold text-[10px] border transition-colors ${
                          momoNetwork === provider.id
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {provider.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Affiliate Partner Referral Banner */}
            {affiliateRef && (
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-semibold">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>{language === 'en' ? 'Referred by partner: ' : 'Parrainé par le partenaire : '}<strong>{affiliateRef}</strong></span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  {language === 'en' ? 'VIP Affiliate' : 'Affilié VIP'}
                </span>
              </div>
            )}

            {/* 4. Promo Code & Discount */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {language === 'en' ? '4. Promo Code or Discount (Optional):' : '4. Code Promo ou Réduction (Optionnel) :'}
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Ex: PROMO20, VIP50, LANCEMENT"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={isApplyingPromo || !promoCodeInput.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isApplyingPromo ? (language === 'en' ? 'Checking...' : 'Validation...') : t('checkout.applyBtn', 'Appliquer')}
                </button>
              </div>

              {promoError && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {promoError}
                </div>
              )}

              {appliedPromo && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? <>Code <strong>{appliedPromo.code}</strong> activated!</> : <>Code <strong>{appliedPromo.code}</strong> activé !</>}</span>
                  </div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    -{formatMoney(discountAmount, currencyCode)}
                  </span>
                </div>
              )}
            </div>

            {/* Suggestion 3: Auto-Renew Recurring Checkbox */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
              <input
                type="checkbox"
                id="autoRenewCheck"
                checked={isAutoRenew}
                onChange={(e) => setIsAutoRenew(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
              />
              <label htmlFor="autoRenewCheck" className="text-xs cursor-pointer select-none">
                <span className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <span>{language === 'en' ? 'Automatic Renewal (Recurring MoMo Mandate)' : 'Renouvellement automatique (Mandat Récurrent MoMo)'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                    {language === 'en' ? 'Save 10%' : 'Économisez 10%'}
                  </span>
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  {language === 'en'
                    ? 'Your subscription will be renewed automatically on each due date without service interruption. Cancel anytime in 1 click.'
                    : "Votre abonnement sera reconduit automatiquement à chaque date d'échéance sans coupure de service. Annulable à tout moment en 1 clic."}
                </span>
              </label>
            </div>

            {/* Submit CTA */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <button
                type="submit"
                disabled={isSubmitting || !activePlan}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 hover:scale-[1.01]"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? (language === 'en' ? 'Processing...' : 'Initialisation...') 
                    : language === 'en'
                    ? `Pay ${formatMoney(finalPrice, currencyCode)} & Join`
                    : `Payer ${formatMoney(finalPrice, currencyCode)} et Rejoindre`}
                </span>
                {appliedPromo && (
                  <span className="line-through text-xs text-emerald-200 ml-1">
                    {formatMoney(convertedOriginalPrice, currencyCode)}
                  </span>
                )}
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {language === 'en' ? (
                    <>Powered by <strong className="text-zinc-600 dark:text-zinc-300">WA Pay</strong> • Multi-carrier secure African payment rails</>
                  ) : (
                    <>Propulsé par <strong className="text-zinc-600 dark:text-zinc-300">WA Pay</strong> • Infrastructure de paiement sécurisée multi-opérateurs</>
                  )}
                </span>
              </div>
            </div>

          </form>
        )}

      </div>

      {/* Official Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          payment={{
            reference: verifiedSuccess?.verification?.reference || initiatedTx?.reference || `WTM_${Date.now()}`,
            amount: finalPrice,
            currency: currencyCode,
            customerName: customerName.trim() || 'Membre WTM',
            customerPhone: customerPhone.trim(),
            channel: paymentChannel,
            momoProvider: paymentChannel === 'mobile_money' ? momoNetwork : undefined,
            provider: isSandboxMode ? 'sandbox' : 'paystack',
            groupName: selectedGroup?.name,
            planName: activePlan?.name,
            verifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

    </div>
  );
};
