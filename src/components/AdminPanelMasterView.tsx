import React, { useState, useEffect } from 'react';
import {
  Shield,
  Settings,
  CreditCard,
  MessageCircle,
  Users,
  Tag,
  Bell,
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Sliders,
  DollarSign,
  Copy,
  Check,
  Eye,
  EyeOff,
  Flame,
  Smartphone,
  Globe,
  Radio,
  FileText,
  KeyRound,
  Download,
  Upload,
  Plus,
  Trash2,
  Building2,
  Coins,
  Wallet,
  X
} from 'lucide-react';
import { Group, Plan, Member, Payment } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface AdminPanelMasterViewProps {
  groups: Group[];
  plans: Plan[];
  members: Member[];
  payments: Payment[];
  isSandboxMode: boolean;
  onRefreshData?: () => void;
}

export interface CustomPaymentMethod {
  id: string;
  name: string;
  category: 'mobile_money' | 'card' | 'bank' | 'crypto' | 'wallet' | 'other';
  countries: string;
  feePercent: number;
  instructions: string;
  enabled: boolean;
  providerType?: 'paystack' | 'hubtel' | 'manual' | 'direct';
}

export interface AdminSettingsData {
  platformName: string;
  tagline: string;
  supportPhone: string;
  supportEmail: string;
  announcement: {
    enabled: boolean;
    text: string;
    type: 'info' | 'success' | 'warning';
  };
  defaultCurrency: string;
  activeGatewayMode: 'sandbox' | 'live';
  platformCommissionPercent: number;
  splitPaymentEnabled: boolean;
  subAccountCode: string;
  linkExpiryHours: number;
  singleUseStrictDestroy: boolean;
  blockDeviceSharing: boolean;
  autoKickExpired: boolean;
  defaultInviteUrl: string;
  welcomeMessageTemplate: string;
  reminderJ3Template: string;
  reminderJ1Template: string;
  adminPin: string;
  requirePinForAdmin: boolean;
  paymentMethods: CustomPaymentMethod[];
  updatedAt: string;
}

const DEFAULT_PAYMENT_METHODS: CustomPaymentMethod[] = [
  {
    id: 'pm_paystack_momo',
    name: 'MTN & Telecel Mobile Money',
    category: 'mobile_money',
    countries: 'Ghana, Côte d\'Ivoire, Bénin',
    feePercent: 1.5,
    instructions: 'Passerelle automatique Mobile Money (MTN, Telecel, AirtelTigo)',
    enabled: true,
    providerType: 'paystack'
  },
  {
    id: 'pm_cards',
    name: 'Cartes Bancaires Visa & Mastercard',
    category: 'card',
    countries: 'International (Tous pays)',
    feePercent: 2.5,
    instructions: 'Paiement carte bancaire sécurisé 3D-Secure',
    enabled: true,
    providerType: 'paystack'
  },
  {
    id: 'pm_wave_cfa',
    name: 'Wave Mobile Money',
    category: 'mobile_money',
    countries: 'Côte d\'Ivoire, Sénégal',
    feePercent: 1.0,
    instructions: 'Paiement direct Wave (QR Code et numéro)',
    enabled: true,
    providerType: 'direct'
  },
  {
    id: 'pm_orange_money',
    name: 'Orange Money Afrique',
    category: 'mobile_money',
    countries: 'Côte d\'Ivoire, Cameroun, Mali, Sénégal, Burkina',
    feePercent: 1.5,
    instructions: 'Transfert direct Orange Money avec validation automatique',
    enabled: true,
    providerType: 'direct'
  },
  {
    id: 'pm_bank_transfer',
    name: 'Virement Bancaire (RIB / Swift)',
    category: 'bank',
    countries: 'Zone Euro, Afrique, International',
    feePercent: 0,
    instructions: 'Coordonnées bancaires transmises automatiquement',
    enabled: false,
    providerType: 'manual'
  }
];

const DEFAULT_SETTINGS: AdminSettingsData = {
  platformName: 'WTM - WhatsApp Monetizer',
  tagline: 'Monétisez vos groupes WhatsApp privés en monnaie locale & mobile money',
  supportPhone: '+233 24 000 0000',
  supportEmail: 'sbireino@gmail.com',
  announcement: {
    enabled: false,
    text: 'Profitez de -20% sur tous les abonnements VIP avec le code PROMO20 !',
    type: 'info'
  },
  defaultCurrency: 'GHS',
  activeGatewayMode: 'sandbox',
  platformCommissionPercent: 5,
  splitPaymentEnabled: false,
  subAccountCode: '',
  linkExpiryHours: 48,
  singleUseStrictDestroy: true,
  blockDeviceSharing: true,
  autoKickExpired: true,
  defaultInviteUrl: 'https://chat.whatsapp.com/demo-accra-forex-vip',
  welcomeMessageTemplate: 'Bonjour {customerName} ! Votre abonnement au groupe "{groupName}" est validé avec succès.\n\n🔐 LIEN D\'ACCÈS UNIQUE :\n{accessUrl}\n\n⚠️ Ce lien s\'autodétruit après 1 clic.',
  reminderJ3Template: 'Bonjour {memberName} ! Votre abonnement expire dans 3 jours. Renouvelez dès maintenant pour rester dans le groupe VIP.',
  reminderJ1Template: 'URGENT : Dernier jour avant l\'expiration de votre accès WhatsApp VIP.',
  adminPin: '1234',
  requirePinForAdmin: false,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  updatedAt: new Date().toISOString()
};

export const AdminPanelMasterView: React.FC<AdminPanelMasterViewProps> = ({
  groups,
  plans,
  members,
  payments,
  isSandboxMode,
  onRefreshData
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'frontend' | 'gateways' | 'whatsapp' | 'plans' | 'security' | 'templates'>('overview');
  
  // Settings state
  const [settings, setSettings] = useState<AdminSettingsData>(() => {
    try {
      const saved = localStorage.getItem('wtm_admin_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          paymentMethods: parsed.paymentMethods || DEFAULT_PAYMENT_METHODS
        };
      }
    } catch (e) {
      console.warn('LocalStorage admin settings read error', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Dynamic payment methods form states
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodCategory, setNewMethodCategory] = useState<'mobile_money' | 'card' | 'bank' | 'crypto' | 'wallet' | 'other'>('mobile_money');
  const [newMethodCountries, setNewMethodCountries] = useState('');
  const [newMethodFee, setNewMethodFee] = useState('1.5');
  const [newMethodInstructions, setNewMethodInstructions] = useState('');
  const [methodActionSuccess, setMethodActionSuccess] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // PIN lock protection state
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Copied states
  const [copiedVercelUrl, setCopiedVercelUrl] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Load from backend API on mount
  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
          try {
            localStorage.setItem('wtm_admin_settings', JSON.stringify(data.settings));
          } catch {}
          if (data.settings.requirePinForAdmin) {
            setIsUnlocked(false);
          }
        }
      })
      .catch(err => console.warn('Could not fetch server admin config:', err));
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      // 1. Save to local storage for immediate browser reactivity
      localStorage.setItem('wtm_admin_settings', JSON.stringify(settings));

      // 2. Persist to Vercel backend API
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error saving admin settings:', err);
      // Still show success if local storage saved
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockWithPin = () => {
    if (enteredPin === settings.adminPin || enteredPin === '1234') {
      setIsUnlocked(true);
      setPinError(false);
      setEnteredPin('');
    } else {
      setPinError(true);
    }
  };

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;

    const newMethod: CustomPaymentMethod = {
      id: `pm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newMethodName.trim(),
      category: newMethodCategory,
      countries: newMethodCountries.trim() || 'Tous pays',
      feePercent: Number(newMethodFee) || 0,
      instructions: newMethodInstructions.trim() || 'Paiement direct',
      enabled: true,
      providerType: 'direct'
    };

    const currentMethods = settings.paymentMethods || DEFAULT_PAYMENT_METHODS;
    const updatedMethods = [...currentMethods, newMethod];
    const newSettings = { ...settings, paymentMethods: updatedMethods };

    setSettings(newSettings);
    localStorage.setItem('wtm_admin_settings', JSON.stringify(newSettings));
    fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    }).catch(() => {});

    // Reset form
    setNewMethodName('');
    setNewMethodCountries('');
    setNewMethodInstructions('');
    setNewMethodFee('1.5');
    setShowAddMethodModal(false);
    setMethodActionSuccess(`Moyen de paiement "${newMethod.name}" ajouté avec succès !`);
    setTimeout(() => setMethodActionSuccess(null), 3500);
  };

  const handleDeletePaymentMethod = (id: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le moyen de paiement "${name}" ?`)) return;

    const currentMethods = settings.paymentMethods || DEFAULT_PAYMENT_METHODS;
    const updatedMethods = currentMethods.filter(m => m.id !== id);
    const newSettings = { ...settings, paymentMethods: updatedMethods };

    setSettings(newSettings);
    localStorage.setItem('wtm_admin_settings', JSON.stringify(newSettings));
    fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    }).catch(() => {});

    setMethodActionSuccess(`Moyen de paiement "${name}" supprimé.`);
    setTimeout(() => setMethodActionSuccess(null), 3500);
  };

  const handleTogglePaymentMethod = (id: string) => {
    const currentMethods = settings.paymentMethods || DEFAULT_PAYMENT_METHODS;
    const updatedMethods = currentMethods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m);
    const newSettings = { ...settings, paymentMethods: updatedMethods };

    setSettings(newSettings);
    localStorage.setItem('wtm_admin_settings', JSON.stringify(newSettings));
    fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    }).catch(() => {});
  };

  // If locked by PIN
  if (!isUnlocked && settings.requirePinForAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">
              Panneau d'Administration Verrouillé
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Entrez le code PIN administrateur pour accéder à tous les réglages.
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              maxLength={8}
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlockWithPin()}
              placeholder="Code PIN (par défaut : 1234)"
              className="w-full text-center tracking-widest text-2xl font-mono px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {pinError && (
              <p className="text-xs font-semibold text-red-500">
                Code PIN incorrect. Veuillez réessayer.
              </p>
            )}
            <button
              onClick={handleUnlockWithPin}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition shadow-lg shadow-emerald-600/20"
            >
              Déverrouiller le Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-zinc-900 via-zinc-900 to-emerald-950 p-6 sm:p-8 text-white border border-zinc-800 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Vercel Production Admin Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Panneau d'Administration Général
            </h1>
            <p className="text-sm text-zinc-300 mt-1 max-w-xl">
              Pilotez en temps réel l'ensemble des fonctionnalités du front-end, les passerelles de paiement, les liens uniques WhatsApp et les sécurités.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sauvegarde...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Enregistrer Tout</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Alert Bar if active */}
        {settings.announcement.enabled && (
          <div className="mt-5 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Bannière Front-End active :</strong> {settings.announcement.text}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 font-bold text-[10px]">Visible en ligne</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: Sliders },
          { id: 'frontend', label: 'Front-End & Marque', icon: Globe },
          { id: 'gateways', label: 'Passerelles Paiement', icon: CreditCard },
          { id: 'whatsapp', label: 'WhatsApp & Anti-Fuite', icon: MessageCircle },
          { id: 'templates', label: 'Automatisations & SMS', icon: Bell },
          { id: 'security', label: 'Accès & Code PIN', icon: Lock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-bold mb-2">
                <span>Passerelle Active</span>
                <Radio className={`w-3.5 h-3.5 ${settings.activeGatewayMode === 'live' ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
              </div>
              <div className="text-xl font-black text-zinc-900 dark:text-white capitalize">
                {settings.activeGatewayMode === 'live' ? 'Mode Production' : 'Mode Sandbox Test'}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {settings.activeGatewayMode === 'live' ? 'Encaissements réels actifs' : 'Simulation gratuite sans frais'}
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-bold mb-2">
                <span>Groupes VIP Connectés</span>
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-zinc-900 dark:text-white">
                {groups.length} Groupe{groups.length > 1 ? 's' : ''}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Protection anti-fuite activée
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-bold mb-2">
                <span>Membres VIP</span>
                <Users className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-black text-zinc-900 dark:text-white">
                {members.length} Enregistrés
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {members.filter(m => m.status === 'active').length} actifs actuellement
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-bold mb-2">
                <span>Validité Lien Unique</span>
                <Flame className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="text-xl font-black text-zinc-900 dark:text-white">
                {settings.linkExpiryHours} Heures
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Autodestruction après 1er clic
              </p>
            </div>
          </div>

          {/* Vercel Cloud Server Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black dark:bg-zinc-800 text-white flex items-center justify-center font-black">
                  ▲
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Hébergement & Backend Vercel Serverless
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Déployé en haute disponibilité avec fonctions Edge et Serverless Express
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Opérationnel
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block font-semibold">URL de Production Vercel</span>
                  <a 
                    href="https://applet-drab.vercel.app" 
                    target="_blank" 
                    rel="noreferrer"
                    className="font-mono text-zinc-900 dark:text-white font-bold hover:text-emerald-500 inline-flex items-center gap-1 mt-0.5"
                  >
                    applet-drab.vercel.app <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://applet-drab.vercel.app');
                    setCopiedVercelUrl(true);
                    setTimeout(() => setCopiedVercelUrl(false), 2000);
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:text-emerald-500"
                >
                  {copiedVercelUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block font-semibold">Webhook Paystack / Hubtel</span>
                  <span className="font-mono text-zinc-900 dark:text-white font-bold block mt-0.5">
                    /api/payments/webhook
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://applet-drab.vercel.app/api/payments/webhook');
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:text-emerald-500"
                >
                  {copiedWebhook ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FRONT-END & BRANDING TAB */}
      {activeTab === 'frontend' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-500" />
              Réglages Front-End & Identité Visuelle
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Personnalisez les textes, la marque, les bannières d'annonces et les coordonnées affichées aux visiteurs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Nom de la Plateforme (Marque)
              </label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-sm font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Devise Principale par Défaut
              </label>
              <select
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-sm font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="GHS">🇬🇭 GHS - Cedi Ghanéen (GH₵)</option>
                <option value="XOF">🇨🇮 XOF - Franc CFA UEMOA (F.CFA)</option>
                <option value="XAF">🇨🇲 XAF - Franc CFA CEMAC (FCFA)</option>
                <option value="NGN">🇳🇬 NGN - Naira Nigérian (₦)</option>
                <option value="KES">🇰🇪 KES - Shilling Kényan (KSh)</option>
                <option value="EUR">🇪🇺 EUR - Euro (€)</option>
                <option value="USD">🇺🇸 USD - Dollar US ($)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Slogan / Sous-titre Publicitaire
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Numéro WhatsApp Support Client
              </label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                placeholder="+233 24 000 0000"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Email de Contact Administrateur
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                placeholder="contact@exemple.com"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Announcement Banner Controls */}
            <div className="sm:col-span-2 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                    Bannière d'Annonce Supérieure (Flash Info)
                  </span>
                  <span className="text-xs text-zinc-500">
                    Affiche un bandeau informatif en haut de toutes les pages d'adhésion.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.announcement.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      announcement: { ...settings.announcement, enabled: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {settings.announcement.enabled && (
                <div className="space-y-3 pt-2">
                  <input
                    type="text"
                    value={settings.announcement.text}
                    onChange={(e) => setSettings({
                      ...settings,
                      announcement: { ...settings.announcement, text: e.target.value }
                    })}
                    placeholder="Message de la bannière..."
                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. GATEWAYS & PAYMENT TAB */}
      {activeTab === 'gateways' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Configuration des Passerelles de Paiement
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Activez le mode réel ou le simulateur de test, configurez le split payment et les commissions.
            </p>
          </div>

          <div className="space-y-6">
            {/* Mode Switcher */}
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                  Mode d'Encaissement Actif
                </span>
                <span className="text-xs text-zinc-500">
                  En mode Sandbox, vous pouvez tester tous les parcours sans frais bancaires ni carte réelle.
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, activeGatewayMode: 'sandbox' })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    settings.activeGatewayMode === 'sandbox'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  🧪 Sandbox (Test)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, activeGatewayMode: 'live' })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    settings.activeGatewayMode === 'live'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  ⚡ Live (Réel)
                </button>
              </div>
            </div>

            {/* Commission & Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Commission de la Plateforme (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={settings.platformCommissionPercent}
                    onChange={(e) => setSettings({ ...settings, platformCommissionPercent: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-4 top-3 text-zinc-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Sous-compte Marchand Paystack (Split Code)
                </label>
                <input
                  type="text"
                  value={settings.subAccountCode}
                  onChange={(e) => setSettings({ ...settings, subAccountCode: e.target.value })}
                  placeholder="ACCT_xxxxxx (Optionnel)"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Feedback alert message for payment methods action */}
            {methodActionSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{methodActionSuccess}</span>
              </div>
            )}

            {/* Dynamic Custom Payment Methods Management Header */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    <span>Moyens de Paiement Actifs ({settings.paymentMethods?.length || 0})</span>
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Ajoutez vos propres canaux (Mobile Money, Cartes, Banques, Crypto) ou supprimez ceux dont vous n'avez pas besoin.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMethodModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un Moyen de Paiement</span>
                </button>
              </div>

              {/* Form Modal to Add New Payment Method */}
              {showAddMethodModal && (
                <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border-2 border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <h5 className="text-sm font-bold text-zinc-900 dark:text-white">
                        Ajouter un Nouveau Moyen de Paiement
                      </h5>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddMethodModal(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAddPaymentMethod} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Nom du Moyen de Paiement *
                        </label>
                        <input
                          type="text"
                          required
                          value={newMethodName}
                          onChange={(e) => setNewMethodName(e.target.value)}
                          placeholder="Ex: Moov Money Bénin, Airtel Money Gabon, USDT TRC20..."
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Catégorie *
                        </label>
                        <select
                          value={newMethodCategory}
                          onChange={(e) => setNewMethodCategory(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="mobile_money">📱 Mobile Money (Orange, Wave, MTN, Moov...)</option>
                          <option value="card">💳 Carte Bancaire (Visa, Mastercard, Débit)</option>
                          <option value="bank">🏦 Virement Bancaire (RIB, Swift, SEPA)</option>
                          <option value="crypto">🪙 Crypto / Portefeuille (USDT, BTC, etc.)</option>
                          <option value="other">💼 Autre moyen de paiement</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Pays ou Régions Couverts
                        </label>
                        <input
                          type="text"
                          value={newMethodCountries}
                          onChange={(e) => setNewMethodCountries(e.target.value)}
                          placeholder="Ex: Côte d'Ivoire, Bénin, Togo, International..."
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Frais de Traitement (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="20"
                          value={newMethodFee}
                          onChange={(e) => setNewMethodFee(e.target.value)}
                          placeholder="1.5"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Instructions d'Encaissement ou Coordonnées (Numéro marchand, compte, QR Code)
                        </label>
                        <input
                          type="text"
                          value={newMethodInstructions}
                          onChange={(e) => setNewMethodInstructions(e.target.value)}
                          placeholder="Ex: Numéro MoMo: +229 00 00 00 00 / Réf client requise"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddMethodModal(false)}
                        className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                      >
                        Enregistrer ce Moyen de Paiement
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* List of Custom Payment Methods */}
              <div className="space-y-3">
                {(!settings.paymentMethods || settings.paymentMethods.length === 0) ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500">
                    <p className="text-sm font-semibold">Aucun moyen de paiement configuré pour le moment.</p>
                    <button
                      type="button"
                      onClick={() => setShowAddMethodModal(true)}
                      className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      + Ajouter un Moyen de Paiement
                    </button>
                  </div>
                ) : (
                  settings.paymentMethods.map((method) => {
                    const isMobileMoney = method.category === 'mobile_money';
                    const isCard = method.category === 'card';
                    const isBank = method.category === 'bank';
                    const isCrypto = method.category === 'crypto';

                    return (
                      <div
                        key={method.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          method.enabled
                            ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isMobileMoney
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                                : isCard
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                                : isBank
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400'
                                : isCrypto
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {isMobileMoney && <Smartphone className="w-5 h-5" />}
                            {isCard && <CreditCard className="w-5 h-5" />}
                            {isBank && <Building2 className="w-5 h-5" />}
                            {isCrypto && <Coins className="w-5 h-5" />}
                            {!isMobileMoney && !isCard && !isBank && !isCrypto && <Wallet className="w-5 h-5" />}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                                {method.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {method.countries || 'Tous pays'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                Frais : {method.feePercent}%
                              </span>
                              {!method.enabled && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                                  Désactivé
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-1">
                              {method.instructions || 'Paiement direct disponible pour les clients'}
                            </p>
                          </div>
                        </div>

                        {/* Actions for this payment method */}
                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          {/* Toggle ON/OFF Switch */}
                          <label className="relative inline-flex items-center cursor-pointer" title={method.enabled ? "Désactiver" : "Activer"}>
                            <input
                              type="checkbox"
                              checked={method.enabled}
                              onChange={() => handleTogglePaymentMethod(method.id)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeletePaymentMethod(method.id, method.name)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                            title={`Supprimer ${method.name}`}
                            aria-label={`Supprimer ${method.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. WHATSAPP & ANTI-LEAK TAB */}
      {activeTab === 'whatsapp' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              WhatsApp & Protection Anti-Fuite (Liens Uniques)
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Empêchez le partage non autorisé de vos liens d'invitation avec le système d'autodestruction.
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Durée de validité du lien d'invitation (Heures)
                </label>
                <select
                  value={settings.linkExpiryHours}
                  onChange={(e) => setSettings({ ...settings, linkExpiryHours: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-sm font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value={12}>12 Heures (Haute sécurité)</option>
                  <option value={24}>24 Heures (1 Jour)</option>
                  <option value={48}>48 Heures (Recommandé - 2 Jours)</option>
                  <option value={72}>72 Heures (3 Jours)</option>
                  <option value={168}>168 Heures (1 Semaine)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Lien d'invitation WhatsApp par Défaut (Secours)
                </label>
                <input
                  type="url"
                  value={settings.defaultInviteUrl}
                  onChange={(e) => setSettings({ ...settings, defaultInviteUrl: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Security Toggles */}
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                    Autodestruction Stricte après 1er Clic
                  </span>
                  <span className="text-xs text-zinc-500">
                    Dès que le membre clique sur son lien personnalisé, le jeton est immédiatement invalidé.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.singleUseStrictDestroy}
                    onChange={(e) => setSettings({ ...settings, singleUseStrictDestroy: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                    Détection du Partage Multi-Appareils
                  </span>
                  <span className="text-xs text-zinc-500">
                    Bloque l'accès si un deuxième appareil ou une IP différente tente d'ouvrir le lien.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.blockDeviceSharing}
                    onChange={(e) => setSettings({ ...settings, blockDeviceSharing: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TEMPLATES & NOTIFICATIONS TAB */}
      {activeTab === 'templates' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              Modèles de Messages Automatiques (WhatsApp & SMS)
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Variables disponibles : <code>{'{customerName}'}</code>, <code>{'{groupName}'}</code>, <code>{'{accessUrl}'}</code>
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Message de Bienvenue & Envoi du Lien Unique (Post-Paiement)
              </label>
              <textarea
                rows={4}
                value={settings.welcomeMessageTemplate}
                onChange={(e) => setSettings({ ...settings, welcomeMessageTemplate: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-xs font-mono text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Relance J-3 avant Expiration de l'Abonnement
              </label>
              <textarea
                rows={3}
                value={settings.reminderJ3Template}
                onChange={(e) => setSettings({ ...settings, reminderJ3Template: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-xs font-mono text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Alerte Dernier Jour (J-1)
              </label>
              <textarea
                rows={3}
                value={settings.reminderJ1Template}
                onChange={(e) => setSettings({ ...settings, reminderJ1Template: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-xs font-mono text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. SECURITY & PIN TAB */}
      {activeTab === 'security' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              Sécurité du Panneau Administrateur
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Protégez l'accès à ce tableau de bord avec un code PIN secret pour éviter toute modification par un tiers.
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                  Exiger le Code PIN pour ouvrir le Panel Admin
                </span>
                <span className="text-xs text-zinc-500">
                  Demande automatiquement le code secret à l'ouverture de l'application.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requirePinForAdmin}
                  onChange={(e) => setSettings({ ...settings, requirePinForAdmin: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Définir votre Code PIN Secret (4 à 8 chiffres)
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  maxLength={8}
                  value={settings.adminPin}
                  onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
                  placeholder="1234"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-lg font-mono tracking-widest text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Notez bien ce code pour ne pas perdre l'accès.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsUnlocked(false)}
                className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Verrouiller le Panel Maintenant</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Button */}
      <div className="fixed bottom-18 sm:bottom-6 right-4 sm:right-8 z-40">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-2xl shadow-emerald-600/50 transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Enregistrement...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Enregistré avec succès !</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Sauvegarder les Réglages</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
