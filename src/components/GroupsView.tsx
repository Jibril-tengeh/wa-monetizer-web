import React, { useState } from 'react';
import { 
  MessageCircle, 
  Plus, 
  Edit3, 
  Archive, 
  RotateCcw, 
  ExternalLink, 
  Copy, 
  Check, 
  Users, 
  ShieldAlert,
  Search,
  Smartphone,
  RefreshCw,
  Lock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Group, Plan } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface GroupsViewProps {
  groups: Group[];
  plans: Plan[];
  onCreateGroup: (data: Omit<Group, 'id' | 'adminId' | 'createdAt'>) => Promise<void>;
  onUpdateGroup: (id: string, data: Partial<Group>) => Promise<void>;
  onArchiveGroup: (id: string, currentStatus: 'active' | 'archived') => Promise<void>;
  onNavigateToCheckout: (groupId: string) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  groups,
  plans,
  onCreateGroup,
  onUpdateGroup,
  onArchiveGroup,
  onNavigateToCheckout
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Link rotation state (Suggestion #6)
  const [rotatingGroup, setRotatingGroup] = useState<Group | null>(null);
  const [newInviteLink, setNewInviteLink] = useState('');
  const [rotatingSuccess, setRotatingSuccess] = useState(false);
  const [rotatingLoading, setRotatingLoading] = useState(false);

  const handleOpenRotate = (group: Group) => {
    setRotatingGroup(group);
    setNewInviteLink(group.inviteLink || '');
    setRotatingSuccess(false);
  };

  const handleConfirmRotate = async () => {
    if (!rotatingGroup) return;
    setRotatingLoading(true);
    try {
      await onUpdateGroup(rotatingGroup.id, {
        inviteLink: newInviteLink.trim(),
        lastLinkRotatedAt: new Date().toISOString()
      });
      setRotatingSuccess(true);
      setTimeout(() => {
        setRotatingGroup(null);
        setRotatingSuccess(false);
      }, 1500);
    } catch (e: any) {
      alert(`Erreur de renouvellement : ${e.message}`);
    } finally {
      setRotatingLoading(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    description: string;
    inviteLink: string;
    accessInstructions: string;
    rules: string;
    currency: 'GHS';
    status: 'active' | 'archived';
  }>({
    name: '',
    category: 'Finance & Business',
    description: '',
    inviteLink: '',
    accessInstructions: 'Merci pour votre paiement en GHS ! Cliquez sur le lien pour rejoindre notre groupe WhatsApp officiel. Un administrateur vérifiera votre pseudo sous 15 minutes.',
    rules: '1. Respect mutuel et bienveillance.\n2. Aucun spam ou publicité non sollicitée.',
    currency: 'GHS',
    status: 'active'
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      category: 'Finance & Business',
      description: '',
      inviteLink: '',
      accessInstructions: 'Merci pour votre paiement en GHS ! Cliquez sur le lien pour rejoindre notre groupe WhatsApp officiel. Un administrateur vérifiera votre pseudo sous 15 minutes.',
      rules: '1. Respect mutuel et bienveillance.\n2. Aucun spam ou publicité non sollicitée.',
      currency: 'GHS',
      status: 'active'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      category: group.category || 'Général',
      description: group.description || '',
      inviteLink: group.inviteLink || '',
      accessInstructions: group.accessInstructions,
      rules: group.rules || '',
      currency: 'GHS',
      status: group.status
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Le nom du groupe WhatsApp est obligatoire.');
      return;
    }
    if (!formData.accessInstructions.trim()) {
      setFormError("Les instructions d'accès sont requises.");
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      if (editingGroup) {
        await onUpdateGroup(editingGroup.id, formData);
      } else {
        await onCreateGroup(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPublicLink = (groupId: string) => {
    const url = `${window.location.origin}/#join?groupId=${groupId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(groupId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredGroups = groups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          g.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          g.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* WhatsApp Compliance Notice */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 dark:text-emerald-200">
          <strong className="font-semibold">{t('groups.complianceTitle', 'Conformité et Sécurité WhatsApp')} :</strong> {t('groups.complianceNotice', 'WA Monetizer n\'exige aucun mot de passe personnel, cookie de session ou automatisation non autorisée (Web Scraping). L\'accès aux groupes s\'effectue via des liens d\'invitation officiels et des instructions configurées par vos soins.')}
        </div>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{t('groups.title', 'Groupes WhatsApp Monétisés')}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {groups.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t('groups.subtitle', 'Configurez vos communautés WhatsApp, formules associées et instructions d\'adhésion.')}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('groups.createBtn', 'Créer un Groupe')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={t('groups.searchPlaceholder', 'Rechercher un groupe...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-auto">
          {(['all', 'active', 'archived'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === filter
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {filter === 'all' ? t('groups.filterAll', 'Tous') : filter === 'active' ? t('groups.filterActive', 'Actifs') : t('groups.filterArchived', 'Archivés')}
            </button>
          ))}
        </div>
      </div>

      {/* Group Cards Grid */}
      {filteredGroups.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-10 text-center">
          <MessageCircle className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Aucun groupe WhatsApp trouvé
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'Essayez de modifier votre recherche.' : 'Créez votre premier groupe pour commencer à monétiser vos accès.'}
          </p>
          {!searchTerm && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              Créer mon premier groupe
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map((group) => {
            const groupPlans = plans.filter((p) => p.groupId === group.id && p.isActive);

            return (
              <div
                key={group.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-500/40 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {group.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      group.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {group.status === 'active' ? 'Actif' : 'Archivé'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{group.name}</span>
                  </h3>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2">
                    {group.description || 'Aucune description fournie.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>{t('groups.activePlansCount', 'Formules actives :')}</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {groupPlans.length} {t('plans.activeStatus', 'active')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>{t('groups.acceptedCurrency', 'Devise acceptée :')}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        GHS (Cedi Ghanéen)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
                  {/* Join Group Button -> Enforces Paid Checkout Flow */}
                  <button
                    onClick={() => onNavigateToCheckout(group.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-md shadow-[#25D366]/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    title={t('groups.joinTooltip', 'Adhérer au groupe : L\'adhérent doit obligatoirement payer son abonnement avant d\'accéder au groupe WhatsApp')}
                  >
                    <Lock className="w-3.5 h-3.5 text-white/90 shrink-0" />
                    <span>{t('groups.joinGroupPaid', 'Joindre le groupe (Paiement Obligatoire)')}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-80 shrink-0" />
                  </button>

                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 px-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{t('groups.secureAccessNote', 'Accès sécurisé : le lien WhatsApp est débloqué après paiement validé')}</span>
                  </div>

                  {/* Public Link & Checkout Preview */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyPublicLink(group.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                      title={t('groups.copyPublicLink', 'Copier le lien public pour les adhérents')}
                    >
                      {copiedId === group.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">{t('groups.copiedPublicLink', 'Lien copié !')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{t('groups.copyPublicLink', 'Copier Lien Public')}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onNavigateToCheckout(group.id)}
                      className="flex items-center justify-center p-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                      title={t('groups.testMobileBtn', 'Tester la page d\'adhésion membre')}
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Edit, Rotate Link and Archive Actions */}
                  <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenRotate(group)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1"
                      title={t('groups.rotateLink', 'Renouveler lien')}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{t('groups.rotateLink', 'Renouveler lien')}</span>
                    </button>

                    <button
                      onClick={() => openEditModal(group)}
                      className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('groups.edit', 'Modifier')}</span>
                    </button>

                    <button
                      onClick={() => onArchiveGroup(group.id, group.status)}
                      className="text-xs font-medium text-zinc-500 hover:text-amber-600 flex items-center gap-1"
                    >
                      {group.status === 'active' ? (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archiver</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              {editingGroup ? 'Modifier le Groupe WhatsApp' : 'Nouveau Groupe WhatsApp'}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Renseignez les détails d'accès et consignes de paiement pour vos membres.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom du groupe WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Accra Crypto & Forex VIP 🇬🇭"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Finance & Trading">Finance & Trading</option>
                  <option value="Entrepreneuriat">Entrepreneuriat & E-commerce</option>
                  <option value="Technologie & Code">Technologie & Code</option>
                  <option value="Coaching & Développement">Coaching & Développement</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description du groupe
                </label>
                <textarea
                  rows={2}
                  placeholder="Objectif du groupe, valeur ajoutée pour l'adhérent..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Lien officiel d'invitation WhatsApp (Optionnel)
                </label>
                <input
                  type="url"
                  placeholder="https://chat.whatsapp.com/..."
                  value={formData.inviteLink}
                  onChange={(e) => setFormData({ ...formData, inviteLink: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Ce lien sera révélé au membre uniquement après validation de son paiement.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Instructions d'accès après paiement *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Merci pour votre paiement ! Cliquez sur le lien pour rejoindre..."
                  value={formData.accessInstructions}
                  onChange={(e) => setFormData({ ...formData, accessInstructions: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Règlement intérieur du groupe
                </label>
                <textarea
                  rows={2}
                  placeholder="Règles de bonne conduite, interdiction de spam..."
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : editingGroup ? 'Mettre à jour' : 'Créer le groupe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rotation Modal (Suggestion #6) */}
      {rotatingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Renouveler le Lien d'Invitation
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {rotatingGroup.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              En renouvelant ce lien officiel, vous révoquez l'ancien accès WhatsApp. Tous les futurs paiements recevront de nouveaux jetons à usage unique basés sur ce nouveau lien.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nouveau lien d'invitation WhatsApp :
              </label>
              <input
                type="url"
                required
                placeholder="https://chat.whatsapp.com/..."
                value={newInviteLink}
                onChange={(e) => setNewInviteLink(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {rotatingSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Lien renouvelé et enregistré avec succès !</span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRotatingGroup(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRotate}
                  disabled={rotatingLoading || !newInviteLink.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  {rotatingLoading ? 'Renouvellement...' : 'Valider la Rotation'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
