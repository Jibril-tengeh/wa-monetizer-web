import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, Lock, Clock, FileText } from 'lucide-react';
import { AuditLog } from '../types/index.ts';
import { formatDateFR } from '../utils/formatters.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{t('audit.title', "Journal d'Audit & Sécurité")}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {logs.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t('audit.subtitle', 'Traçabilité immuable de tous les événements administratifs et financiers (append-only).')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t('audit.firestoreBlocked', 'Règles Firestore : Modification & Suppression strictement bloquées')}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={t('audit.searchPlaceholder', 'Rechercher dans les événements...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none self-start sm:self-auto"
        >
          <option value="all">{t('audit.allEntities', 'Toutes les entités')}</option>
          <option value="Group">{t('audit.entityGroups', 'Groupes')}</option>
          <option value="Plan">{t('audit.entityPlans', 'Formules')}</option>
          <option value="Member">{t('audit.entityMembers', 'Membres')}</option>
          <option value="Payment">{t('audit.entityPayments', 'Paiements')}</option>
        </select>
      </div>

      {/* Audit Log Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-10 text-center">
          <FileText className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {t('audit.noLogsTitle', "Aucun enregistrement d'audit")}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {t('audit.noLogsDesc', 'Les opérations sensibles (création de groupe, modification de statut, validation de paiement) sont consignées ici automatiquement.')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">{t('audit.colDateTime', 'Date & Heure')}</th>
                  <th className="py-3 px-4">{t('audit.colAction', 'Action')}</th>
                  <th className="py-3 px-4">{t('audit.colEntity', 'Entité')}</th>
                  <th className="py-3 px-4">{t('audit.colDetails', 'Détails')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="py-3 px-4 text-zinc-500 whitespace-nowrap font-sans">
                      {formatDateFR(log.createdAt, true)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 font-sans">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 font-sans break-words max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
