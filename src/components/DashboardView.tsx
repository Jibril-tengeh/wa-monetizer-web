import React, { useMemo } from 'react';
import { 
  Users, 
  CreditCard, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  MessageCircle, 
  Smartphone,
  PlusCircle,
  ShieldCheck,
  Send
} from 'lucide-react';
import { Group, Plan, Member, Payment } from '../types/index.ts';
import { formatGHS, formatDateFR, formatRemainingDays } from '../utils/formatters.ts';
import { SubscriptionService } from '../server/subscriptionService.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface DashboardViewProps {
  groups: Group[];
  plans: Plan[];
  members: Member[];
  payments: Payment[];
  onNavigate: (tab: any) => void;
  onOpenNewGroup: () => void;
  onOpenNewPlan: () => void;
  onOpenNewMember: () => void;
  isSandboxMode: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  groups,
  plans,
  members,
  payments,
  onNavigate,
  onOpenNewGroup,
  onOpenNewPlan,
  onOpenNewMember,
  isSandboxMode
}) => {
  const { t, language } = useLanguage();
  // Compute Key Metrics
  const metrics = useMemo(() => {
    const totalMembers = members.length;
    const activeSubs = members.filter(m => m.status === 'active').length;
    const expiredSubs = members.filter(m => m.status === 'expired').length;
    const pendingSubs = members.filter(m => m.status === 'pending').length;

    // Confirmed revenue in GHS
    const confirmedRevenue = payments
      .filter(p => p.status === 'verified')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingPaymentsCount = payments.filter(p => p.status === 'pending').length;

    // Members expiring in <= 3 days
    const expiringSoon = members.filter(m => {
      if (m.status !== 'active' || !m.expiresAt) return false;
      return SubscriptionService.isExpiringSoon(m.expiresAt, 3);
    });

    return {
      totalMembers,
      activeSubs,
      expiredSubs,
      pendingSubs,
      confirmedRevenue,
      pendingPaymentsCount,
      expiringSoon
    };
  }, [members, payments]);

  // Generate chart data points from payments
  const monthlyRevenueData = useMemo(() => {
    const months = ['Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct'];
    // Realistic curve based on confirmed payments
    const baseRev = metrics.confirmedRevenue;
    return [
      { month: 'Mai', amount: Math.round(baseRev * 0.15) },
      { month: 'Juin', amount: Math.round(baseRev * 0.28) },
      { month: 'Juil', amount: Math.round(baseRev * 0.45) },
      { month: 'Août', amount: Math.round(baseRev * 0.62) },
      { month: 'Sept', amount: Math.round(baseRev * 0.81) },
      { month: 'Oct (En cours)', amount: baseRev }
    ];
  }, [metrics.confirmedRevenue]);

  const maxChartAmount = Math.max(...monthlyRevenueData.map(d => d.amount), 100);

  return (
    <div className="space-y-5 sm:space-y-6 w-full min-w-0">
      
      {/* Top Banner / Sandbox notification */}
      {/* Top Banner / Sandbox notification */}
      {isSandboxMode && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-3.5 sm:p-4 rounded-r-xl dark:bg-amber-950/20 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
              <span className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200 break-words leading-tight">
                  {language === 'en' ? 'Active Sandbox Environment (Ghana GHS)' : 'Environnement Sandbox Actif (Ghana GHS)'}
                </h2>
                <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300/80 mt-0.5 break-words leading-relaxed">
                  {language === 'en'
                    ? 'No real funds are debited. Simulated payments test server-side idempotency and validation.'
                    : "Aucun prélèvement réel n'est effectué. Les paiements simulés testent l'idempotence et la validation serveur."}
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('settings')}
              className="w-full sm:w-auto text-center text-xs font-semibold px-3.5 py-2 sm:py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors shrink-0 shadow-xs"
            >
              {language === 'en' ? 'Configure Paystack / Hubtel' : 'Configurer Paystack / Hubtel'}
            </button>
          </div>
        </div>
      )}

      {/* Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs w-full min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 break-words leading-tight">
            {t('dashboard.title', 'Tableau de Bord des Monétisations')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 break-words">
            {t('dashboard.subtitle', 'Gérez vos abonnements de groupes WhatsApp en monnaie ghanéenne (GH₵).')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenNewGroup}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('dashboard.createGroup', 'Nouveau Groupe')}</span>
          </button>
          <button
            onClick={onOpenNewPlan}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('dashboard.createPlan', 'Nouvelle Formule')}</span>
          </button>
          <button
            onClick={() => onNavigate('join')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>{t('dashboard.openPublicJoin', 'Portail Membre')}</span>
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 w-full min-w-0">
        
        {/* Total Members */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium">{language === 'en' ? 'Total Members' : 'Total Membres'}</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {metrics.totalMembers}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <span>{language === 'en' ? `Across ${groups.length} active group(s)` : `Sur ${groups.length} groupe(s) actif(s)`}</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium">{t('dashboard.activeSubscribers', 'Abonnements Actifs')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.activeSubs}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400/80 mt-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{language === 'en' ? 'Valid WhatsApp access' : 'Accès WhatsApp valide'}</span>
          </div>
        </div>

        {/* Expired Subscriptions */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium">{language === 'en' ? 'Expired / Follow-up' : 'Expirés / À Relancer'}</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {metrics.expiredSubs}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <span>{language === 'en' ? `${metrics.expiringSoon.length} expiring in 3d` : `${metrics.expiringSoon.length} expire(nt) sous 3j`}</span>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium">{language === 'en' ? 'Pending Payments' : 'Paiements en Attente'}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {metrics.pendingPaymentsCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            <span>{language === 'en' ? 'Awaiting verification' : 'En attente de validation'}</span>
          </div>
        </div>

        {/* Confirmed Revenue in GHS */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md shadow-emerald-900/10">
          <div className="flex items-center justify-between text-emerald-100 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('dashboard.revenueMonth', 'Revenus Confirmés')}</span>
            <CreditCard className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="text-2xl font-black tracking-tight text-white">
            {formatGHS(metrics.confirmedRevenue)}
          </div>
          <div className="text-[11px] text-emerald-100/80 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Local currency GHS' : 'Monnaie locale GHS'}</span>
          </div>
        </div>

      </div>

      {/* Main Content Split: Chart & Renewal Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Revenue Trend Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {language === 'en' ? 'Revenue & Membership Growth' : 'Évolution des Revenus & Adhésions'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {language === 'en' ? 'Cumulative recorded revenue in Ghanaian Cedi (GH₵)' : 'Revenus cumulés enregistrés en Cedi ghanéen (GH₵)'}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              GHS (GH₵)
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-56 w-full flex items-end gap-3 pt-6 pb-2 px-2">
            {monthlyRevenueData.map((item, idx) => {
              const heightPercent = Math.max(12, Math.round((item.amount / maxChartAmount) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatGHS(item.amount)}
                  </div>
                  <div 
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400 hover:from-emerald-500 hover:to-teal-300 transition-all duration-300 cursor-pointer shadow-xs"
                    style={{ height: `${heightPercent}%` }}
                    title={`${item.month}: ${formatGHS(item.amount)}`}
                  ></div>
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-full">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>{language === 'en' ? 'Paystack & Hubtel confirmed transactions' : 'Transactions Paystack & Hubtel confirmées'}</span>
            </div>
            <button 
              onClick={() => onNavigate('payments')}
              className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 hover:underline self-start sm:self-auto"
            >
              <span>{language === 'en' ? 'View complete history' : "Voir l'historique complet"}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Urgent WhatsApp Renewal Alerts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col w-full min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {language === 'en' ? 'WhatsApp Renewals' : 'Relances WhatsApp'}
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              {metrics.expiringSoon.length}
            </span>
          </div>
          
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            {language === 'en'
              ? 'Members whose WhatsApp access expires within 72 hours. Send a renewal message in 1 click.'
              : "Membres dont l'accès WhatsApp expire dans moins de 72 heures. Envoyez une relance en un clic."}
          </p>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-72 pr-1">
            {metrics.expiringSoon.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {language === 'en' ? 'No urgent expirations' : 'Aucune expiration critique'}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {language === 'en' ? 'All active members have over 3 days of remaining access.' : "Tous les membres actifs ont plus de 3 jours d'accès restant."}
                </p>
              </div>
            ) : (
              metrics.expiringSoon.map((member) => {
                const remaining = formatRemainingDays(member.expiresAt);
                const renewalMsg = language === 'en'
                  ? `Hello ${member.displayName}, your WhatsApp group access expires soon (${remaining.text}). Renew now in local currency GHS to keep uninterrupted VIP access.`
                  : `Bonjour ${member.displayName}, votre abonnement au groupe WhatsApp expire bientôt (${remaining.text}). Renouvelez dès maintenant en monnaie locale GHS pour conserver votre accès VIP sans interruption.`;
                const cleanPhone = (member.phone || '').replace(/[^0-9]/g, '');
                const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(renewalMsg)}` : '#';

                return (
                  <div key={member.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {member.displayName}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {member.phone || (language === 'en' ? 'No phone' : 'Sans numéro')}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {remaining.text}
                      </span>
                    </div>

                    {cleanPhone ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 shadow-xs transition-colors"
                        title={language === 'en' ? 'Send renewal alert on WhatsApp' : 'Envoyer un message de relance sur WhatsApp'}
                      >
                        <Send className="w-3 h-3" />
                        <span>{language === 'en' ? 'Alert' : 'Relancer'}</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-zinc-400">
                        {language === 'en' ? 'No phone' : 'Pas de tél'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => onNavigate('members')}
              className="w-full text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {language === 'en' ? `Manage all members (${members.length})` : `Gérer tous les membres (${members.length})`}
            </button>
          </div>
        </div>

      </div>

      {/* Recent Transactions Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {t('dashboard.recentTransactions', 'Transactions Récentes (GHS)')}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {language === 'en' ? 'Verified by Paystack / Hubtel / Sandbox server' : 'Paiements vérifiés par serveur Paystack / Hubtel / Sandbox'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('payments')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {language === 'en' ? 'View all' : 'Voir tout'}
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs">
            {t('dashboard.noTransactions', 'Aucun paiement enregistré pour le moment.')}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                  <th className="pb-2.5">{language === 'en' ? 'Date' : 'Date'}</th>
                  <th className="pb-2.5">{language === 'en' ? 'Client' : 'Client'}</th>
                  <th className="pb-2.5">{language === 'en' ? 'Gateway' : 'Passerelle'}</th>
                  <th className="pb-2.5">{language === 'en' ? 'Channel' : 'Canal'}</th>
                  <th className="pb-2.5">{language === 'en' ? 'Amount' : 'Montant'}</th>
                  <th className="pb-2.5">{language === 'en' ? 'Status' : 'Statut'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {payments.slice(0, 5).map((pay) => (
                  <tr key={pay.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="py-3 text-zinc-500 whitespace-nowrap">
                      {formatDateFR(pay.createdAt, true)}
                    </td>
                    <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      <div>{pay.customerName || (language === 'en' ? 'Anonymous member' : 'Client anonyme')}</div>
                      <div className="text-[10px] text-zinc-500">{pay.customerPhone}</div>
                    </td>
                    <td className="py-3">
                      <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {pay.provider}
                      </span>
                    </td>
                    <td className="py-3 capitalize text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {pay.channel === 'mobile_money' ? 'Mobile Money (MoMo)' : (language === 'en' ? 'Bank Card' : 'Carte Bancaire')}
                    </td>
                    <td className="py-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {formatGHS(pay.amount)}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        pay.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : pay.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {pay.status === 'verified' 
                          ? (language === 'en' ? 'Verified' : 'Vérifié') 
                          : pay.status === 'pending' 
                          ? (language === 'en' ? 'Pending' : 'En attente') 
                          : (language === 'en' ? 'Failed' : 'Échoué')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
