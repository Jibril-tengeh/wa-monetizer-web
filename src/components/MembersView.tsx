import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MessageCircle, 
  Send, 
  Edit2, 
  Plus, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  PhoneCall,
  UserCheck,
  FileSpreadsheet,
  BellRing,
  UserMinus,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Member, Group, Plan, MemberStatus } from '../types/index.ts';
import { formatDateFR, formatRemainingDays } from '../utils/formatters.ts';
import { SubscriptionService } from '../server/subscriptionService.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface MembersViewProps {
  members: Member[];
  groups: Group[];
  plans: Plan[];
  onCreateMember: (data: Omit<Member, 'id' | 'adminId' | 'createdAt'>) => Promise<void>;
  onUpdateMemberStatus: (id: string, status: MemberStatus, notes?: string) => Promise<void>;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  groups,
  plans,
  onCreateMember,
  onUpdateMemberStatus
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberStatus>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Manual Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    groupId: groups[0]?.id || '',
    displayName: '',
    phone: '+233 ',
    email: '',
    status: 'active' as MemberStatus,
    currentPlanId: '',
    durationDays: 30,
    notes: 'Ajout manuel par l\'administrateur'
  });

  // Edit Status Modal
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newStatus, setNewStatus] = useState<MemberStatus>('active');
  const [statusNotes, setStatusNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Automated Lifecycle & WhatsApp Drip State
  const [lifecycleScanning, setLifecycleScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [revokingMemberId, setRevokingMemberId] = useState<string | null>(null);

  const handleRunLifecycleScan = async () => {
    setLifecycleScanning(true);
    setScanFeedback(null);
    try {
      const res = await fetch('/api/v1/lifecycle/run-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members,
          groups,
          plans,
          baseUrl: window.location.origin
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de scan");
      setScanFeedback(data.message);
      setTimeout(() => setScanFeedback(null), 6000);
    } catch (err: any) {
      setScanFeedback(`Erreur : ${err.message}`);
    } finally {
      setLifecycleScanning(false);
    }
  };

  const handleRevokeAndNotify = async (member: Member) => {
    setRevokingMemberId(member.id);
    try {
      const groupName = groups.find(g => g.id === member.groupId)?.name || 'Groupe VIP';
      const res = await fetch('/api/v1/lifecycle/revoke-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member,
          groupName,
          baseUrl: window.location.origin
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de révocation");
      await onUpdateMemberStatus(member.id, 'expired', 'Accès révoqué automatiquement par le cycle de vie WA Monetizer');
      setScanFeedback(`Accès révoqué et notification WhatsApp envoyée à ${member.displayName}`);
      setTimeout(() => setScanFeedback(null), 5000);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setRevokingMemberId(null);
    }
  };

  // Open add modal
  const handleOpenAddModal = () => {
    setAddFormData({
      groupId: groups[0]?.id || '',
      displayName: '',
      phone: '+233 ',
      email: '',
      status: 'active',
      currentPlanId: plans[0]?.id || '',
      durationDays: 30,
      notes: 'Ajout manuel par l\'administrateur'
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleCreateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.displayName.trim()) {
      setFormError('Le nom du membre est requis.');
      return;
    }
    if (!addFormData.groupId) {
      setFormError('Veuillez sélectionner un groupe WhatsApp.');
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      const now = new Date();
      const expires = SubscriptionService.calculateExpirationDate(now, Number(addFormData.durationDays || 30));

      await onCreateMember({
        groupId: addFormData.groupId,
        displayName: addFormData.displayName.trim(),
        phone: addFormData.phone.trim(),
        email: addFormData.email.trim() || undefined,
        status: addFormData.status,
        currentPlanId: addFormData.currentPlanId || undefined,
        startDate: now.toISOString(),
        expiresAt: expires.toISOString(),
        notes: addFormData.notes
      });
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l\'ajout du membre');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusModal = (member: Member) => {
    setEditingMember(member);
    setNewStatus(member.status);
    setStatusNotes(member.notes || '');
  };

  const handleSaveStatus = async () => {
    if (!editingMember) return;
    setLoading(true);
    try {
      await onUpdateMemberStatus(editingMember.id, newStatus, statusNotes);
      setEditingMember(null);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(false);
    }
  };

  // Filter members
  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (m.phone && m.phone.includes(searchTerm)) ||
                          (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesGroup = groupFilter === 'all' || m.groupId === groupFilter;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const handleExportCSV = () => {
    const headers = ['Nom', 'Telephone', 'Email', 'Groupe', 'Statut', 'Date_Debut', 'Date_Expiration'];
    const rows = filteredMembers.map((m) => {
      const g = groups.find(grp => grp.id === m.groupId)?.name || 'Groupe';
      return [
        `"${m.displayName || ''}"`,
        `"${m.phone || ''}"`,
        `"${m.email || ''}"`,
        `"${g}"`,
        `"${m.status || ''}"`,
        `"${m.startDate || ''}"`,
        `"${m.expiresAt || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wtm_membres_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{t('members.title', 'Gestion des Membres & Abonnés')}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {members.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t('members.subtitle', 'Suivi des expirations, relances WhatsApp 1-clic et contrôle manuel des accès.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRunLifecycleScan}
            disabled={lifecycleScanning || members.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-100 transition-colors shadow-xs disabled:opacity-50"
            title="Analyser les dates d'échéance et envoyer les relances WhatsApp"
          >
            <BellRing className={`w-4 h-4 ${lifecycleScanning ? 'animate-spin' : 'text-emerald-600'}`} />
            <span>{lifecycleScanning ? t('members.scanningDrip', 'Scan en cours...') : t('members.scanDripBtn', 'Scan Relances Drip (J-3/J-1)')}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors shadow-xs"
            title="Exporter la liste des membres au format CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exporter</span> CSV
          </button>

          <button
            onClick={handleOpenAddModal}
            disabled={groups.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Ajout Manuel Membre</span>
          </button>
        </div>
      </div>

      {scanFeedback && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-500/30 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
          <BellRing className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{scanFeedback}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone (+233...)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Group Selector */}
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
        >
          <option value="all">Tous les groupes ({groups.length})</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'active', 'pending', 'expired', 'suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize shrink-0 transition-colors ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {st === 'all' ? 'Tous' : st === 'active' ? 'Actifs' : st === 'pending' ? 'En attente' : st === 'expired' ? 'Expirés' : 'Suspendus'}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-10 text-center">
          <Users className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Aucun membre trouvé
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' || groupFilter !== 'all'
              ? 'Aucun membre ne correspond à vos critères de filtrage.'
              : 'Les adhérents s\'afficheront ici automatiquement après paiement sur votre portail, ou après ajout manuel.'}
          </p>
          {groups.length > 0 && !searchTerm && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              Ajouter un premier membre
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Membre</th>
                  <th className="py-3 px-4">Groupe WhatsApp</th>
                  <th className="py-3 px-4">Validité & Expiration</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredMembers.map((member) => {
                  const group = groups.find((g) => g.id === member.groupId);
                  const remaining = formatRemainingDays(member.expiresAt);
                  const cleanPhone = (member.phone || '').replace(/[^0-9]/g, '');

                  // Pre-filled WhatsApp message based on status
                  let waMsg = '';
                  if (member.status === 'active') {
                    if (remaining.isWarning) {
                      waMsg = `Bonjour ${member.displayName}, votre abonnement au groupe ${group?.name || 'WhatsApp'} expire très bientôt (${remaining.text}). Souhaitez-vous le renouveler en GHS ?`;
                    } else {
                      waMsg = `Bonjour ${member.displayName}, merci de faire partie de notre groupe ${group?.name || 'WhatsApp'}. Tout se passe bien pour vous ?`;
                    }
                  } else if (member.status === 'expired') {
                    waMsg = `Bonjour ${member.displayName}, votre abonnement au groupe ${group?.name || 'WhatsApp'} a expiré. Pour réactiver votre accès VIP, réglez en quelques clics via notre portail sécurisé.`;
                  } else {
                    waMsg = `Bonjour ${member.displayName}, concernant votre adhésion au groupe ${group?.name || 'WhatsApp'}...`;
                  }

                  const waDirectUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}` : null;

                  return (
                    <tr key={member.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{member.displayName}</div>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                              {member.phone && (
                                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                                  {member.phone}
                                </span>
                              )}
                              {member.email && (
                                <span className="truncate max-w-[140px] text-zinc-400">
                                  • {member.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Group */}
                      <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300">
                        <span className="font-medium truncate block max-w-[180px]">
                          {group?.name || 'Groupe non spécifié'}
                        </span>
                        {member.notes && (
                          <span className="text-[10px] text-zinc-400 italic block truncate max-w-[180px]">
                            {member.notes}
                          </span>
                        )}
                      </td>

                      {/* Expiration date & countdown */}
                      <td className="py-3.5 px-4">
                        <div className="text-zinc-900 dark:text-zinc-100 font-medium">
                          {formatDateFR(member.expiresAt)}
                        </div>
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            remaining.isExpired
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : remaining.isWarning
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{remaining.text}</span>
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          member.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : member.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : member.status === 'expired'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            member.status === 'active' ? 'bg-emerald-500' : member.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}></span>
                          {member.status === 'active' ? 'Actif' : member.status === 'pending' ? 'En attente' : member.status === 'expired' ? 'Expiré' : member.status === 'suspended' ? 'Suspendu' : 'Remboursé'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Direct WhatsApp Click-to-Chat */}
                          {waDirectUrl && (
                            <a
                              href={waDirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                              title="Discuter / Relancer sur WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          {/* Revoke & WhatsApp Notice button for expired */}
                          {(remaining.isExpired || member.status === 'expired') && (
                            <button
                              onClick={() => handleRevokeAndNotify(member)}
                              disabled={revokingMemberId === member.id}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                              title="Révoquer l'accès et envoyer le lien de renouvellement sur WhatsApp"
                            >
                              <UserMinus className={`w-4 h-4 ${revokingMemberId === member.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}

                          {/* Edit Status */}
                          <button
                            onClick={() => handleOpenStatusModal(member)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Modifier statut ou notes"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Ajout Manuel d'un Membre
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Pour les paiements reçus hors-ligne (espèces, virement direct) ou les accès offerts.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMemberSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Groupe WhatsApp *
                </label>
                <select
                  required
                  value={addFormData.groupId}
                  onChange={(e) => setAddFormData({ ...addFormData, groupId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom ou Pseudo du membre *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Kwame Mensah"
                  value={addFormData.displayName}
                  onChange={(e) => setAddFormData({ ...addFormData, displayName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Numéro WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+233 24 000 0000"
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Durée d'adhésion (Jours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addFormData.durationDays}
                    onChange={(e) => setAddFormData({ ...addFormData, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Statut initial
                </label>
                <select
                  value={addFormData.status}
                  onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value as MemberStatus })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="active">Actif (Accès autorisé)</option>
                  <option value="pending">En attente de validation</option>
                  <option value="suspended">Suspendu</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Notes internes (Optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Paiement cash reçu en main propre à Accra..."
                  value={addFormData.notes}
                  onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Ajouter le membre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Gérer le statut de l'adhérent
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              {editingMember.displayName} ({editingMember.phone || 'Sans téléphone'})
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nouveau statut
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as MemberStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                >
                  <option value="active">Actif (Accès accordé)</option>
                  <option value="pending">En attente de paiement</option>
                  <option value="expired">Expiré (Accès révoqué)</option>
                  <option value="suspended">Suspendu (Violation du règlement)</option>
                  <option value="refunded">Remboursé</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Notes et motif de modification
                </label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Raison du changement de statut..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-lg font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  {loading ? 'Mise à jour...' : 'Appliquer le statut'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
