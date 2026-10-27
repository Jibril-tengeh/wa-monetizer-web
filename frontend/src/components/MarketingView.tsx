import React, { useState } from 'react';
import { 
  Tag, 
  Share2, 
  Plus, 
  Check, 
  Percent, 
  Users, 
  DollarSign, 
  Copy, 
  MessageCircle, 
  Send, 
  ShieldCheck,
  UserPlus,
  Trash2,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { PromoCode, Referral } from '../types/index.ts';
import { formatGHS } from '../utils/formatters.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface MarketingViewProps {
  isSandboxMode: boolean;
}

export const MarketingView: React.FC<MarketingViewProps> = ({ isSandboxMode }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'promo' | 'affiliate' | 'whatsapp' | 'team'>('promo');

  // Promo Codes State
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([
    {
      id: 'promo_1',
      adminId: 'admin_default',
      code: 'PROMO20',
      discountType: 'percentage',
      discountValue: 20,
      usedCount: 7,
      maxUses: 50,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'promo_2',
      adminId: 'admin_default',
      code: 'VIP50',
      discountType: 'fixed',
      discountValue: 50,
      usedCount: 2,
      maxUses: 20,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'promo_3',
      adminId: 'admin_default',
      code: 'LANCEMENT',
      discountType: 'percentage',
      discountValue: 15,
      usedCount: 14,
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ]);

  // Affiliate Referrals State
  const [referrals, setReferrals] = useState<Referral[]>([
    {
      id: 'ref_1',
      adminId: 'admin_default',
      affiliateCode: 'KOFI_VIP',
      referredMemberName: 'Kwame Osei',
      commissionGHS: 15.00,
      status: 'credited',
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'ref_2',
      adminId: 'admin_default',
      affiliateCode: 'AMA_TRADER',
      referredMemberName: 'Abena Darko',
      commissionGHS: 38.00,
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    }
  ]);

  // Team Members State
  const [teamMembers, setTeamMembers] = useState([
    { id: 'tm_1', email: 'sbireino@gmail.com', name: 'Sbireino (Propriétaire)', role: 'superadmin' },
    { id: 'tm_2', email: 'assistant.accra@wtm.local', name: 'Assistant Modérateur', role: 'moderator' },
    { id: 'tm_3', email: 'support.ghana@wtm.local', name: 'Agent Support Client', role: 'support' }
  ]);

  // Form states
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'percentage' | 'fixed'>('percentage');
  const [newPromoValue, setNewPromoValue] = useState(20);
  const [copiedAffiliate, setCopiedAffiliate] = useState<string | null>(null);

  // New Team Member Form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'superadmin' | 'moderator' | 'support'>('moderator');

  // New Affiliate Form
  const [newAffiliateCode, setNewAffiliateCode] = useState('');
  const [newAffiliateName, setNewAffiliateName] = useState('');

  // WhatsApp Cloud API Test State
  const [waTestPhone, setWaTestPhone] = useState('+233 ');
  const [waTemplateType, setWaTemplateType] = useState<'welcome' | 'reminder' | 'payment_confirmed'>('welcome');
  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<string | null>(null);

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;

    const code = newPromoCode.trim().toUpperCase();
    const newCode: PromoCode = {
      id: `promo_${Date.now()}`,
      adminId: 'admin_default',
      code,
      discountType: newPromoType,
      discountValue: Number(newPromoValue),
      usedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setPromoCodes([newCode, ...promoCodes]);
    setNewPromoCode('');

    try {
      await fetch('/api/promo/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          type: newPromoType,
          value: Number(newPromoValue)
        })
      });
    } catch (e) {
      console.warn("Server promo sync failed:", e);
    }
  };

  const handleTogglePromo = async (id: string, code: string) => {
    setPromoCodes(promoCodes.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    try {
      await fetch('/api/promo/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
    } catch (e) {
      console.warn("Server toggle failed:", e);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    const newMember = {
      id: `tm_${Date.now()}`,
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole
    };

    setTeamMembers([...teamMembers, newMember]);
    setNewMemberName('');
    setNewMemberEmail('');

    try {
      await fetch('/api/team/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
    } catch (e) {
      console.warn("Server team sync failed:", e);
    }
  };

  const handleAddAffiliate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAffiliateCode.trim() || !newAffiliateName.trim()) return;

    const code = newAffiliateCode.trim().toUpperCase();
    const newRef: Referral = {
      id: `ref_${Date.now()}`,
      adminId: 'admin_default',
      affiliateCode: code,
      referredMemberName: newAffiliateName.trim(),
      commissionGHS: 25.00,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setReferrals([newRef, ...referrals]);
    setNewAffiliateCode('');
    setNewAffiliateName('');
  };

  const handleCopyAffiliate = (code: string) => {
    const link = `${window.location.origin}/#join?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedAffiliate(code);
    setTimeout(() => setCopiedAffiliate(null), 2500);
  };

  const handleSendWaTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaSending(true);
    setWaStatus(null);
    try {
      const res = await fetch('/api/whatsapp/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: waTestPhone,
          memberName: 'Client Test VIP',
          groupName: 'Accra Forex VIP 🇬🇭',
          remainingDays: waTemplateType === 'reminder' ? 3 : 30
        })
      });
      const data = await res.json();
      if (data.success) {
        setWaStatus("Notification Meta WhatsApp Cloud API envoyée / simulée avec succès !");
      } else {
        setWaStatus(`Statut : ${data.error || 'Succès de simulation'}`);
      }
    } catch (err: any) {
      setWaStatus(`Erreur : ${err.message}`);
    } finally {
      setWaSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>{t('marketing.title', 'Outils Avancés & Croissance')}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {t('marketing.proBadge', 'Pro')}
          </span>
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {t('marketing.subtitle', 'Codes promo, affiliation, WhatsApp Cloud API et gestion d\'équipe multi-admin.')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto scrollbar-none text-xs font-semibold">
        <button
          onClick={() => setActiveTab('promo')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
            activeTab === 'promo'
              ? 'bg-emerald-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>{t('marketing.tabPromo', 'Codes Promo')}</span>
        </button>

        <button
          onClick={() => setActiveTab('affiliate')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
            activeTab === 'affiliate'
              ? 'bg-emerald-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{t('marketing.tabAffiliate', 'Affiliation & Parrainage')}</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{t('marketing.tabWhatsApp', 'WhatsApp Cloud API')}</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
            activeTab === 'team'
              ? 'bg-emerald-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('marketing.tabTeam', 'Équipe Multi-Admin')}</span>
        </button>
      </div>

      {/* TAB 1: PROMO CODES */}
      {activeTab === 'promo' && (
        <div className="space-y-6">
          {/* Add Promo Code Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              {t('marketing.createNewPromo', 'Créer un nouveau code promotionnel')}
            </h3>
            <form onSubmit={handleAddPromo} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('marketing.promoCodeLabel', 'Code promo *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: GHANA25"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('marketing.discountTypeLabel', 'Type de réduction')}
                </label>
                <select
                  value={newPromoType}
                  onChange={(e) => setNewPromoType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                >
                  <option value="percentage">{t('marketing.discountPercentage', 'Pourcentage (%)')}</option>
                  <option value="fixed">{t('marketing.discountFixed', 'Montant fixe (GHS)')}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('marketing.valueLabel', 'Valeur')}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newPromoValue}
                  onChange={(e) => setNewPromoValue(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  {t('marketing.addCodeBtn', 'Ajouter le Code')}
                </button>
              </div>
            </form>
          </div>

          {/* Promo Codes List */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">{t('marketing.colCode', 'Code Promo')}</th>
                  <th className="py-3 px-4">{t('marketing.colDiscount', 'Réduction')}</th>
                  <th className="py-3 px-4">{t('marketing.colUses', 'Utilisations')}</th>
                  <th className="py-3 px-4">{t('marketing.colStatus', 'Statut')}</th>
                  <th className="py-3 px-4 text-right">{t('marketing.colAction', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {promoCodes.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {p.code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                      {p.discountType === 'percentage' ? `${p.discountValue}%` : `${p.discountValue} GHS`}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                      {p.usedCount} {t('marketing.times', 'fois')} {p.maxUses ? `/ ${p.maxUses}` : ''}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-zinc-200 text-zinc-600'
                      }`}>
                        {p.isActive ? t('common.active', 'Actif') : (language === 'en' ? 'Disabled' : 'Désactivé')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleTogglePromo(p.id, p.code)}
                        className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-emerald-600"
                      >
                        {p.isActive ? t('marketing.deactivate', 'Désactiver') : t('marketing.activate', 'Activer')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AFFILIATE PROGRAM */}
      {activeTab === 'affiliate' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 text-white shadow-md">
            <h3 className="font-black text-lg">{t('marketing.affiliateBannerTitle', 'Programme de Parrainage & Affiliation WhatsApp')}</h3>
            <p className="text-xs text-emerald-100 mt-1 max-w-xl">
              {t('marketing.affiliateBannerDesc', 'Permettez à vos membres et créateurs partenaires de promouvoir votre groupe WhatsApp en échange d\'une commission en GHS créditée automatiquement sur chaque abonnement validé.')}
            </p>
          </div>

          {/* Create Affiliate Partner Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>{t('marketing.createAffiliateTitle', 'Créer un nouveau partenaire affilié')}</span>
            </h3>
            <form onSubmit={handleAddAffiliate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('marketing.affiliateCodeLabel', 'Code Affilié *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ACCRA_FOREX"
                  value={newAffiliateCode}
                  onChange={(e) => setNewAffiliateCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('marketing.partnerNameLabel', 'Nom du Partenaire *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Emmanuel Mensah"
                  value={newAffiliateName}
                  onChange={(e) => setNewAffiliateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  {t('marketing.addAffiliateBtn', 'Ajouter Affilié (10% GHS)')}
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['KOFI_VIP', 'AMA_TRADER'].map((code) => (
              <div key={code} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-emerald-600">{code}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {t('marketing.affiliateCommissionBadge', 'Commission : 10% GHS')}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {t('marketing.affiliateLinkPrefix', 'Lien affilié :')} <span className="font-mono text-zinc-700 dark:text-zinc-300">/#join?ref={code}</span>
                </div>
                <button
                  onClick={() => handleCopyAffiliate(code)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedAffiliate === code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAffiliate === code ? t('marketing.copiedAffiliateLink', 'Lien d\'affiliation copié !') : t('marketing.copyAffiliateLink', 'Copier lien affilié')}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Referrals Ledger */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 font-bold text-xs">
              {t('marketing.referralLedgerTitle', 'Commissions de parrainage générées')}
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500">
                <tr>
                  <th className="py-2.5 px-4">{t('marketing.colAffiliate', 'Affilié')}</th>
                  <th className="py-2.5 px-4">{t('marketing.colReferred', 'Filleul')}</th>
                  <th className="py-2.5 px-4">{t('marketing.colCommission', 'Commission')}</th>
                  <th className="py-2.5 px-4">{t('marketing.colStatus', 'Statut')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{r.affiliateCode}</td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">{r.referredMemberName}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{formatGHS(r.commissionGHS)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'credited' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status === 'credited' ? t('marketing.statusCredited', 'Crédité') : t('marketing.statusPending', 'En attente')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WHATSAPP CLOUD API */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {t('marketing.waCloudTitle', 'WhatsApp Cloud API Officielle (Meta Graph API)')}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t('marketing.waCloudDesc', 'Permet l\'envoi direct et automatisé de messages de bienvenue avec lien à usage unique et de relances d\'expiration (J-3) via l\'API officielle de Meta, sans risque de bannissement de numéro.')}
            </p>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 font-mono text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
              <div>WHATSAPP_PHONE_NUMBER_ID : •••••••••••</div>
              <div>WHATSAPP_ACCESS_TOKEN : Permanent Meta Business System User</div>
            </div>

            {/* Template Selector */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                {t('marketing.waTemplateSelector', 'Modèle de message transactionnel Meta :')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'welcome', label: t('marketing.waTplWelcome', 'Bienvenue & Lien OTP Unique') },
                  { id: 'reminder', label: t('marketing.waTplReminder', 'Relance Expiration (J-3)') },
                  { id: 'payment_confirmed', label: t('marketing.waTplPaymentConfirmed', 'Confirmation Paiement GHS') }
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setWaTemplateType(tpl.id as any)}
                    className={`p-2.5 rounded-xl text-left border text-xs transition-colors ${
                      waTemplateType === tpl.id
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test message sender */}
            <form onSubmit={handleSendWaTest} className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3 text-xs">
              <span className="font-semibold block text-zinc-700 dark:text-zinc-300">
                {t('marketing.waTestLiveNotice', 'Tester l\'envoi d\'une notification officielle en direct :')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="+233 24 123 4567"
                  value={waTestPhone}
                  onChange={(e) => setWaTestPhone(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={waSending}
                  className="py-2 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{waSending ? t('marketing.sendingNotice', 'Envoi...') : t('marketing.sendMetaNoticeBtn', 'Envoyer notification Meta')}</span>
                </button>
              </div>

              {waStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  {waStatus}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: TEAM MULTI-ADMIN */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          
          {/* Add Team Member Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>{t('marketing.teamAddTitle', 'Ajouter un collaborateur ou modérateur')}</span>
            </h3>
            <form onSubmit={handleAddTeamMember} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('marketing.fullNameLabel', 'Nom complet *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Kwame Mensah"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('marketing.emailLabel', 'Adresse e-mail *')}
                </label>
                <input
                  type="email"
                  required
                  placeholder="kwame@gmail.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('marketing.accessRoleLabel', 'Rôle d\'accès')}
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none font-semibold"
                >
                  <option value="moderator">{t('marketing.roleModerator', 'Modérateur (Gestion membres & relances)')}</option>
                  <option value="support">{t('marketing.roleSupport', 'Support Client (Lecture seule)')}</option>
                  <option value="superadmin">{t('marketing.roleSuperadmin', 'SuperAdmin (Accès total)')}</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  {t('marketing.addToStaffBtn', 'Ajouter au Staff')}
                </button>
              </div>
            </form>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {t('marketing.teamListTitle', 'Membres de l\'Équipe & Niveaux de Privilèges')}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t('marketing.teamListDesc', 'Les modérateurs peuvent relancer les adhérents WhatsApp et mettre à jour leurs statuts sans jamais voir ni modifier vos clés secrètes Paystack / Hubtel.')}
            </p>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {teamMembers.map((tm) => (
                <div key={tm.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{tm.name}</div>
                    <div className="text-zinc-500 text-[11px]">{tm.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      tm.role === 'superadmin' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' 
                        : tm.role === 'moderator'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {tm.role === 'superadmin' ? 'SuperAdmin' : tm.role === 'moderator' ? (language === 'en' ? 'Moderator' : 'Modérateur') : 'Support'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
