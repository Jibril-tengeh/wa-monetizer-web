import React, { useState, useEffect } from 'react';
import { ShieldCheck, MessageCircle, AlertTriangle, ExternalLink, ArrowRight, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface AccessLandingViewProps {
  token: string;
  onNavigateHome: () => void;
}

export const AccessLandingView: React.FC<AccessLandingViewProps> = ({ token, onNavigateHome }) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg(t('access.missingToken', "Jeton d'invitation manquant."));
      setLoading(false);
      return;
    }

    // Attempt to consume the single-use token
    fetch('/api/access/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid && data.inviteUrl) {
          setInviteUrl(data.inviteUrl);
        } else {
          setErrorMsg(data.error || t('access.invalidTokenDefault', "Ce lien à usage unique a déjà été utilisé et ne fonctionne plus."));
        }
      })
      .catch((err) => {
        setErrorMsg(`${t('access.checkError', "Erreur de vérification du lien : ")}${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, t]);

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl text-center space-y-6">
        
        {loading ? (
          <div className="py-8 space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-semibold text-zinc-500">{t('access.validating', "Validation de votre lien d'accès unique...")}</p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              {t('access.expiredBadge', "Lien Expiré / Consommé")}
            </span>

            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {t('access.invalidTitle', "Lien à Usage Unique Invalide")}
            </h2>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {errorMsg}
            </p>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 text-[11px] text-zinc-500 text-left space-y-1">
              <div className="font-semibold text-zinc-700 dark:text-zinc-300">{t('access.whyTitle', "Pourquoi cette mesure ?")}</div>
              <div>{t('access.whyDesc', "Afin de protéger la valeur des contenus VIP, nos liens d'invitation WhatsApp sont strictement nominatifs et s'autodétruisent dès le premier clic.")}</div>
            </div>

            <button
              onClick={onNavigateHome}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
            >
              {t('access.backHome', "Retour à l'accueil")}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {t('access.consumedBadge', "Lien Unique Consommé avec Succès")}
            </span>

            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {t('access.unlockedTitle', "Votre Accès WhatsApp VIP est Déverrouillé")}
            </h2>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('access.unlockedDesc', "Ce lien a été consommé et ne pourra plus être réutilisé. Cliquez sur le bouton ci-dessous pour entrer dans le groupe WhatsApp.")}
            </p>

            {inviteUrl && (
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{t('access.joinGroupBtn', "Rejoindre le Groupe WhatsApp")}</span>
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            )}

            <p className="text-[10px] text-zinc-400">
              {t('access.welcomeCommunity', "Bienvenue dans la communauté !")}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
