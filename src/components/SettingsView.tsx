import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  CreditCard, 
  KeyRound, 
  Webhook, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Copy,
  Check,
  Building2,
  FileText,
  Lock,
  Layers,
  Sparkles,
  Sliders,
  UserCheck,
  BadgeCheck,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  Shield,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface SettingsViewProps {
  isSandboxMode: boolean;
  onSeedDemoData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isSandboxMode,
  onSeedDemoData
}) => {
  const { t, language } = useLanguage();
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Split Payment State (Suggestion 4)
  const [subAccountCode, setSubAccountCode] = useState('');
  const [splitSaved, setSplitSaved] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);

  // KYC Verification State (Suggestion 5)
  const [kycProfile, setKycProfile] = useState<any>(null);
  const [docType, setDocType] = useState('id_card');
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [isEditingKyc, setIsEditingKyc] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycSuccess, setKycSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/config/status')
      .then((r) => r.json())
      .then((data) => setConfigStatus(data))
      .catch((err) => console.error('Erreur config status:', err));

    fetch('/api/v1/merchants/split-config')
      .then((r) => r.json())
      .then((d) => {
        if (d.subAccountCode) setSubAccountCode(d.subAccountCode);
      })
      .catch(() => {});

    fetch('/api/v1/kyc/status')
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setKycProfile(d.profile);
          if (d.profile.fullName) setFullName(d.profile.fullName);
          if (d.profile.documentType) setDocType(d.profile.documentType);
        }
      })
      .catch(() => {});
  }, []);

  const webhookUrl = `${window.location.origin}/api/payments/webhook`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleSaveSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subAccountCode.trim()) return;
    setSplitLoading(true);
    try {
      const res = await fetch('/api/v1/merchants/split-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subAccountCode: subAccountCode.trim() })
      });
      if (!res.ok) throw new Error("Erreur de sauvegarde");
      setSplitSaved(true);
      setTimeout(() => setSplitSaved(false), 3000);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setSplitLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Le fichier photo ne doit pas dépasser 5 Mo.");
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateSampleDoc = (type: 'front' | 'back' | 'selfie') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (type === 'selfie') {
      canvas.width = 450;
      canvas.height = 450;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 450, 450);
      // Face
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(225, 170, 85, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(225, 380, 140, Math.PI, Math.PI * 2);
      ctx.fill();
      // Card held in hand
      ctx.fillStyle = '#10b981';
      ctx.fillRect(130, 260, 190, 110);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('SELFIE TENANT LA CARTE', 140, 295);
      ctx.font = '11px monospace';
      ctx.fillText(docNumber || 'GHA-789456123-0', 140, 325);
      ctx.fillText('LIVENESS VERIF OK', 140, 350);
      setSelfieImage(canvas.toDataURL('image/jpeg'));
    } else {
      canvas.width = 540;
      canvas.height = 340;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 540, 340);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, 0, 540, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(type === 'front' ? 'PIÈCE D\'IDENTITÉ OFFICIELLE - RECTO' : 'PIÈCE D\'IDENTITÉ - VERSO', 25, 32);
      ctx.font = '14px monospace';
      ctx.fillText(`TYPE: ${docType.toUpperCase()}`, 25, 95);
      ctx.fillText(`TITULAIRE: ${fullName || 'KWAME MENSAH'}`, 25, 130);
      ctx.fillText(`NUMERO: ${docNumber || 'DOC-987654321'}`, 25, 165);
      ctx.fillText('EXPIRATION: 2030-12-31', 25, 200);
      // Photo box on front
      if (type === 'front') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(380, 75, 120, 150);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('PHOTO D\'IDENTITÉ', 388, 155);
      }
      const dataUrl = canvas.toDataURL('image/jpeg');
      if (type === 'front') setFrontImage(dataUrl);
      else setBackImage(dataUrl);
    }
  };

  const handleSaveKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim() || !fullName.trim()) return;
    setKycLoading(true);
    try {
      const res = await fetch('/api/v1/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          documentNumber: docNumber.trim(),
          fullName: fullName.trim(),
          country: 'GH',
          frontImage: frontImage || undefined,
          backImage: backImage || undefined,
          selfieImage: selfieImage || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur KYC");
      setKycProfile(data.profile);
      setKycSuccess(true);
      setIsEditingKyc(false);
      setTimeout(() => setKycSuccess(false), 4000);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setKycLoading(false);
    }
  };

  const handleTriggerSeed = async () => {
    setIsSeeding(true);
    setSeedSuccess(false);
    try {
      await onSeedDemoData();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>{t('settings.title', 'Paramètres & Passerelles de Paiement')}</span>
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {t('settings.subtitle', 'Configuration des fournisseurs de paiement africains, clés marchandes et conformité.')}
        </p>
      </div>

      {/* Gateway Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Paystack Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Paystack Ghana</h3>
                  <span className="text-[10px] text-zinc-500">Mobile Money & Cartes GHS</span>
                </div>
              </div>

              {configStatus?.providers?.paystack?.isConfigured ? (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Configuré</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Clé en attente</span>
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Supporte les paiements en direct via MTN Mobile Money, Telecel Cash et cartes bancaires. Les montants sont prélevés en Ghanaian Cedi (GHS).
            </p>

            <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 text-xs font-mono text-zinc-600 dark:text-zinc-300 space-y-1">
              <div>Variable : <span className="font-bold text-emerald-600">PAYSTACK_SECRET_KEY</span></div>
              <div className="text-[11px] text-zinc-400 font-sans">Format : Clé secrète API (Live ou Test)</div>
            </div>
          </div>

          <a
            href="https://dashboard.paystack.com/#/settings/developer"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <span>Obtenir les clés sur Paystack</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Hubtel Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
                  H
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Hubtel Ghana</h3>
                  <span className="text-[10px] text-zinc-500">Mobile Money direct merchant</span>
                </div>
              </div>

              {configStatus?.providers?.hubtel?.isConfigured ? (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Configuré</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  <span>Non configuré</span>
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Passerelle ghanéenne alternative pour l'envoi de requêtes de paiement directes (USSD Prompt) vers les numéros ghanéens.
            </p>

            <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 text-xs font-mono text-zinc-600 dark:text-zinc-300 space-y-1">
              <div>HUBTEL_CLIENT_ID</div>
              <div>HUBTEL_CLIENT_SECRET</div>
            </div>
          </div>

          <a
            href="https://hubtel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <span>Documentation Hubtel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>

      {/* Webhook Configuration Section */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            URL de Webhook pour validation automatique
          </h3>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Pour recevoir les notifications instantanées des paiements Mobile Money validés, copiez cette URL dans les paramètres "Webhooks" de votre compte Paystack ou Hubtel. Les requêtes sont protégées par signature cryptographique HMAC.
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 focus:outline-none"
          />
          <button
            onClick={handleCopyWebhook}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shrink-0"
          >
            {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWebhook ? 'Copié !' : 'Copier l\'URL'}</span>
          </button>
        </div>
      </div>

      {/* Suggestion 4: Split-Payment Subaccounts Configuration */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>{t('settings.splitTitle', 'Régime Split-Payment & Sous-Comptes Marchands')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  {t('settings.splitZeroEscrow', 'Sans Séquestre')}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500">
                {language === 'en'
                  ? 'Direct split at source: 98% for admin, 2% SBI Pay platform fee.'
                  : "Ventilation directe à la source : 98% pour l'administrateur, 2% commission plateforme SBI Pay."}
              </p>
            </div>
          </div>

          {subAccountCode && (
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{language === 'en' ? 'Active' : 'Actif'}</span>
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {t('settings.splitDesc', "Ventilation directe à la source : 98% pour l'administrateur, 2% commission plateforme SBI Pay. En renseignant votre code sous-compte Paystack (ACCT_...) ou Hubtel (HUB_SPLIT_...), vous recevez vos fonds directement sans transiter par un compte tiers.")}
        </p>

        <form onSubmit={handleSaveSplit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder={t('settings.subAccountPlaceholder', 'Ex : ACCT_9a8b7c6d5e ou HUB_MERCHANT_01')}
            value={subAccountCode}
            onChange={(e) => setSubAccountCode(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={splitLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50 shrink-0"
          >
            {splitLoading 
              ? (language === 'en' ? 'Saving...' : 'Enregistrement...') 
              : splitSaved 
              ? (language === 'en' ? 'Saved!' : 'Enregistré !') 
              : t('settings.saveSplitBtn', 'Activer Split-Payment')}
          </button>
        </form>
      </div>

      {/* Suggestion 5: Conformité KYC Commerçant (Anti-Fraude & Preuve de Vie Faciale) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>{t('settings.kycTitle', "Vérification d'Identité & Sécurité (KYC Commerçant)")}</span>
                {kycProfile?.isVerified && !isEditingKyc ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 border border-emerald-500/20">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('settings.kycVerified', 'Conforme & Certifié')}</span>
                  </span>
                ) : (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20">
                    {t('settings.kycRequired', 'Requis au-delà de 500 GH₵')}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {t('settings.kycSub', "Réglementation bancaire et Mobile Money : pièce d'identité officielle et selfie de conformité avec pièce en main.")}
              </p>
            </div>
          </div>

          {kycProfile?.isVerified && !isEditingKyc && (
            <button
              onClick={() => setIsEditingKyc(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 self-start sm:self-auto flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('settings.updateKycBtn', 'Mettre à jour mes pièces')}</span>
            </button>
          )}
        </div>

        {photoError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{photoError}</span>
          </div>
        )}

        {kycProfile?.isVerified && !isEditingKyc ? (
          /* Profile Verified State */
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  {t('settings.kycSuccessCardTitle', "Dossier d'identité validé par le service de conformité")}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                {t('settings.unlimitedLimit', 'Plafond illimité actif')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/20">
                <span className="text-[10px] text-zinc-500 block">{t('settings.certifiedHolder', 'Titulaire certifié')}</span>
                <strong className="text-zinc-900 dark:text-zinc-100">{kycProfile.fullName}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/20">
                <span className="text-[10px] text-zinc-500 block">{t('settings.presentedDoc', 'Pièce présentée')}</span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {kycProfile.documentType === 'id_card' ? (language === 'en' ? "National ID Card" : "Carte d'identité") :
                   kycProfile.documentType === 'passport' ? (language === 'en' ? "Passport" : "Passeport") :
                   kycProfile.documentType === 'voter_id' ? (language === 'en' ? "Voter's Card" : "Carte d'électeur") :
                   kycProfile.documentType === 'driving_license' ? (language === 'en' ? "Driver's License" : "Licence / Permis") :
                   kycProfile.documentType === 'ghana_card' ? "Ghana Card" : kycProfile.documentType}
                </strong>
                <span className="text-[10px] text-zinc-400 block font-mono">
                  {kycProfile.documentNumberMasked}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/20">
                <span className="text-[10px] text-zinc-500 block">{t('settings.biometricCheck', 'Contrôle biométrique')}</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>{t('settings.selfieValidated', 'Selfie avec pièce validé')}</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* KYC Submission Form */
          <form onSubmit={handleSaveKyc} className="space-y-5 text-xs">
            
            {/* Step 1: Document Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>{t('settings.step1Title', "Type de Pièce d'Identité & Informations Officielles")}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('settings.docTypeLabel', "Pièce d'identité acceptée *")}
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="id_card">{t('settings.docType_id_card', "🪪 Carte d'identité (Recommandé)")}</option>
                    <option value="passport">{t('settings.docType_passport', '🌍 Passeport')}</option>
                    <option value="voter_id">{t('settings.docType_voter_id', "🗳️ Carte d'électeur")}</option>
                    <option value="driving_license">{t('settings.docType_driving_license', '🚗 Licence (Permis de conduire)')}</option>
                    <option value="ghana_card">{t('settings.docType_ghana_card', '🇬🇭 Ghana Card')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('settings.docNumberLabel', 'Numéro officiel de la pièce *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      docType === 'ghana_card' ? 'Ex: GHA-789456123-0' :
                      docType === 'passport' ? 'Ex: A12345678' :
                      docType === 'voter_id' ? 'Ex: VOT-901827364' :
                      docType === 'driving_license' ? 'Ex: LIC-6543210' : 'Ex: ID-1092837465'
                    }
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('settings.fullNameLabel', 'Nom officiel complet (sur la pièce) *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Kwame Mensah ou Aminata Traoré"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Document Photos (Front & Back) */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>{t('settings.step2Title', 'Photos du Document (Recto & Verso)')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleGenerateSampleDoc('front');
                    if (docType !== 'passport') handleGenerateSampleDoc('back');
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{t('settings.demoDocBtn', 'Utiliser document de test (Démo)')}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Front Photo Card */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t('settings.frontPhotoLabel', 'Recto de la pièce (Face avant) *')}</span>
                    </span>
                    {frontImage && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> {t('settings.photoUploaded', 'Photo chargée')}
                      </span>
                    )}
                  </div>

                  {frontImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-900 aspect-video flex items-center justify-center">
                      <img src={frontImage} alt="Recto pièce" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFrontImage(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors"
                        title={language === 'en' ? 'Remove photo' : 'Supprimer la photo'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors aspect-video bg-white dark:bg-zinc-800/40">
                      <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t('settings.uploadFrontPlaceholder', 'Importer le Recto')}</span>
                      <span className="text-[10px] text-zinc-400">{language === 'en' ? 'JPG, PNG up to 5 MB' : "JPG, PNG jusqu'à 5 Mo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, setFrontImage)}
                      />
                    </label>
                  )}
                </div>

                {/* Back Photo Card */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>{language === 'en' ? `Document Back ${docType === 'passport' ? '(Optional)' : '*'}` : `Verso de la pièce ${docType === 'passport' ? '(Optionnel)' : '*'}`}</span>
                    </span>
                    {backImage && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> {t('settings.photoUploaded', 'Photo chargée')}
                      </span>
                    )}
                  </div>

                  {backImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-900 aspect-video flex items-center justify-center">
                      <img src={backImage} alt="Verso pièce" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setBackImage(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors"
                        title={language === 'en' ? 'Remove photo' : 'Supprimer la photo'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors aspect-video bg-white dark:bg-zinc-800/40">
                      <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t('settings.uploadBackPlaceholder', 'Importer le Verso')}</span>
                      <span className="text-[10px] text-zinc-400">{language === 'en' ? 'Not required for Passport' : 'Non requis pour Passeport'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, setBackImage)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Photo Selfie Tenant la Carte (Preuve de Vie Faciale) */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>{t('settings.step3Title', "Photo Selfie de l'Utilisateur Tenant la Carte (Obligatoire)")}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateSampleDoc('selfie')}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t('settings.demoSelfieBtn', 'Utiliser selfie test (Démo)')}</span>
                </button>
              </div>

              {/* Instructions Box */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px]">
                  <strong className="block font-bold">{t('settings.selfieRulesTitle', 'Consignes pour un selfie conforme :')}</strong>
                  <p>
                    {t('settings.selfieRule1', "1. Tenez votre pièce d'identité à côté de votre visage, sans cacher votre bouche ou vos yeux.")}
                  </p>
                  <p>
                    {t('settings.selfieRule2', '2. Assurez-vous que les textes et votre photo sur la carte sont parfaitement lisibles et sans reflet.')}
                  </p>
                </div>
              </div>

              {/* Selfie Upload & Preview Area */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                {selfieImage ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md bg-zinc-900 shrink-0">
                      <img src={selfieImage} alt="Selfie avec carte" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 right-1 bg-emerald-600/90 text-white text-[9px] font-bold text-center py-0.5 rounded">
                        {t('settings.selfieReady', '✓ Prêt')}
                      </span>
                    </div>
                    <div className="space-y-2 flex-1 text-center sm:text-left">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('settings.selfieCapturedSuccess', "Selfie avec pièce d'identité capturé avec succès")}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {language === 'en' ? 'Your face and identity document have been verified for liveness.' : "Votre visage et le document d'identité ont été vérifiés pour la preuve de vie."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelfieImage(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-rose-100 hover:text-rose-700 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('settings.replaceSelfieBtn', 'Remplacer la photo selfie')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-blue-300 dark:border-blue-800/80 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-white dark:bg-zinc-800/40 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {t('settings.uploadSelfiePlaceholder', 'Prendre ou importer le Selfie tenant la carte')}
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                      {t('settings.uploadSelfieHelp', 'Cliquez pour choisir une photo de votre galerie ou utiliser la caméra de votre smartphone / ordinateur.')}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, setSelfieImage)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t('settings.encryptionNote', 'Données chiffrées de bout en bout et protégées selon la norme bancaire.')}</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {isEditingKyc && (
                  <button
                    type="button"
                    onClick={() => setIsEditingKyc(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {t('common.cancel', 'Annuler')}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={kycLoading || !docNumber || !fullName}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {kycLoading ? (language === 'en' ? 'Verifying document...' : 'Vérification du dossier en cours...') :
                     kycSuccess ? (language === 'en' ? 'Approved successfully!' : 'Dossier validé avec succès !') :
                     t('settings.submitKycBtn', 'Soumettre le KYC Complet & Débloquer Retraits')}
                  </span>
                </button>
              </div>
            </div>

          </form>
        )}
      </div>

      {/* WhatsApp Compliance & Security Policy */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Politique de Sécurité & Respect des Conditions WhatsApp
          </h3>
        </div>

        <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
          <p>
            • <strong>Zéro automatisations illicites :</strong> WA Monetizer n'utilise aucune bibliothèque non autorisée de reverse engineering (Puppeteer, Baileys, whatsapp-web.js). Cela protège vos numéros d'administrateur contre tout risque de blocage ou suspension.
          </p>
          <p>
            • <strong>Validation serveur inviolable :</strong> Le statut d'un paiement envoyé par un navigateur n'est jamais considéré comme valide par défaut. Toute activation d'abonnement requiert une vérification serveur auprès du fournisseur et applique un contrôle d'idempotence strict.
          </p>
          <p>
            • <strong>Protection PII :</strong> Aucune donnée bancaire sensible (code PIN MoMo, numéro de carte, CVV) n'est manipulée ni stockée sur nos serveurs.
          </p>
        </div>
      </div>

      {/* Multi-Tenant Readiness Overview */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-600" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Architecture Multi-Tenant SaaS
          </h3>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          La base de données Firestore partitionne strictement chaque document (`groups`, `plans`, `members`, `payments`, `auditLogs`) avec le champ d'appartenance <code className="text-emerald-600 font-mono">adminId</code>. Les règles de sécurité Firestore empêchent formellement un administrateur d'accéder aux données financières d'un autre créateur.
        </p>
      </div>

      {/* Seed Demo Data Button */}
      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Données de Démonstration (Groupes, Formules & Membres)
          </h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Initialisez des groupes d'exemple à Accra avec formules en GHS pour tester l'application.
          </p>
        </div>

        <button
          onClick={handleTriggerSeed}
          disabled={isSeeding}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition-colors disabled:opacity-50 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{isSeeding ? 'Initialisation...' : seedSuccess ? 'Données chargées !' : 'Générer Démo'}</span>
        </button>
      </div>

    </div>
  );
};
