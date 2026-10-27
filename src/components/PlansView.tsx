import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Check, 
  Edit3, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Trash2,
  Calendar,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Plan, Group } from '../types/index.ts';
import { formatGHS } from '../utils/formatters.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface PlansViewProps {
  plans: Plan[];
  groups: Group[];
  onCreatePlan: (data: Omit<Plan, 'id' | 'adminId' | 'createdAt'>) => Promise<void>;
  onUpdatePlan: (id: string, data: Partial<Plan>) => Promise<void>;
  onToggleActive: (id: string, currentActive: boolean) => Promise<void>;
}

export const PlansView: React.FC<PlansViewProps> = ({
  plans,
  groups,
  onCreatePlan,
  onUpdatePlan,
  onToggleActive
}) => {
  const { t } = useLanguage();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    groupId: groups[0]?.id || '',
    name: '',
    description: '',
    price: 150,
    durationDays: 30,
    isActive: true,
    featureInput: '',
    features: ['Accès illimité au groupe WhatsApp', 'Signaux et alertes prioritaires', 'Support administrateur réactif']
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      groupId: groups[0]?.id || '',
      name: '',
      description: '',
      price: 150,
      durationDays: 30,
      isActive: true,
      featureInput: '',
      features: ['Accès au groupe WhatsApp VIP', 'Alertes en temps réel', 'Assistance par l\'administrateur']
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      groupId: plan.groupId,
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      featureInput: '',
      features: plan.features || []
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const addFeature = () => {
    if (formData.featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, formData.featureInput.trim()],
        featureInput: ''
      });
    }
  };

  const removeFeature = (idx: number) => {
    const updated = [...formData.features];
    updated.splice(idx, 1);
    setFormData({ ...formData, features: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Le nom de la formule est requis.');
      return;
    }
    if (!formData.groupId) {
      setFormError('Veuillez sélectionner un groupe WhatsApp.');
      return;
    }
    if (formData.price <= 0) {
      setFormError('Le prix en GHS doit être supérieur à 0.');
      return;
    }
    if (formData.durationDays <= 0) {
      setFormError('La durée doit être supérieure à 0 jour.');
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      if (editingPlan) {
        await onUpdatePlan(editingPlan.id, {
          groupId: formData.groupId,
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          durationDays: Number(formData.durationDays),
          isActive: formData.isActive,
          features: formData.features
        });
      } else {
        await onCreatePlan({
          groupId: formData.groupId,
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          currency: 'GHS',
          durationDays: Number(formData.durationDays),
          isActive: formData.isActive,
          features: formData.features
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (selectedGroupId === 'all') return true;
    return p.groupId === selectedGroupId;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{t('plans.title', 'Formules & Tarifs d\'Abonnement')}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {plans.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t('plans.subtitle', 'Configurez vos tarifs en Cedi ghanéen (GH₵) : 7 jours, 30 jours, 90 jours ou durée sur-mesure.')}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          disabled={groups.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('plans.createBtn', 'Nouvelle Formule')}</span>
        </button>
      </div>

      {/* Filter by Group */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-zinc-500 font-medium shrink-0">Filtrer par groupe :</span>
          <button
            onClick={() => setSelectedGroupId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
              selectedGroupId === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            Tous les groupes ({plans.length})
          </button>
          {groups.map((grp) => (
            <button
              key={grp.id}
              onClick={() => setSelectedGroupId(grp.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                selectedGroupId === grp.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {grp.name}
            </button>
          ))}
        </div>
      )}

      {/* Plan Cards Grid */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-10 text-center">
          <Package className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Aucune formule de tarification disponible
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {groups.length === 0 
              ? 'Veuillez d\'abord créer un groupe WhatsApp avant de lui associer des formules d\'abonnement.'
              : 'Créez votre première formule (7 jours, 30 jours ou 90 jours) pour lancer les souscriptions.'}
          </p>
          {groups.length > 0 && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              Créer une formule
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => {
            const group = groups.find((g) => g.id === plan.groupId);
            const isHighlight = plan.durationDays === 30; // popular monthly

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-5 border transition-all flex flex-col justify-between relative ${
                  isHighlight
                    ? 'bg-white dark:bg-zinc-900 border-emerald-500 shadow-md shadow-emerald-500/10'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                } ${!plan.isActive ? 'opacity-65' : ''}`}
              >
                {isHighlight && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                    Populaire (Mensuel)
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider truncate">
                      {group?.name || 'Groupe WhatsApp'}
                    </span>
                    <button
                      onClick={() => onToggleActive(plan.id, plan.isActive)}
                      className={`text-xs flex items-center gap-1 font-semibold ${
                        plan.isActive ? 'text-emerald-600' : 'text-zinc-400'
                      }`}
                      title={plan.isActive ? 'Désactiver la formule' : 'Activer la formule'}
                    >
                      {plan.isActive ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-zinc-400" />}
                      <span className="text-[10px]">{plan.isActive ? 'Actif' : 'Inactif'}</span>
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {plan.name}
                  </h3>

                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatGHS(plan.price)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      / {plan.durationDays} jours
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                    {plan.description || 'Accès privilégié au groupe WhatsApp.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Avantages inclus :
                    </span>
                    <ul className="space-y-1.5">
                      {(plan.features || []).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Durée : {plan.durationDays} j</span>
                  </div>

                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              {editingPlan ? 'Modifier la Formule' : 'Nouvelle Formule de Souscription'}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Fixez le prix en GHS et la période de validité de l'accès WhatsApp.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Groupe WhatsApp associé *
                </label>
                <select
                  required
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom de la formule *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Formule Mensuelle VIP"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Prix en Cedi (GHS GH₵) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Durée d'accès (Jours) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Quick Presets for Days */}
              <div>
                <span className="text-[11px] text-zinc-500 block mb-1">Raccourcis de durée standards :</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, durationDays: 7, name: formData.name || 'Accès Hebdo (7 jours)' })}
                    className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium"
                  >
                    7 jours (Hebdo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, durationDays: 30, name: formData.name || 'Accès Mensuel (30 jours)' })}
                    className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium"
                  >
                    30 jours (Mensuel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, durationDays: 90, name: formData.name || 'Accès Trimestriel (90 jours)' })}
                    className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium"
                  >
                    90 jours (Trimestre)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description succincte
                </label>
                <textarea
                  rows={2}
                  placeholder="Points forts de la formule..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Features list */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Avantages inclus (Points clés affichés sur la page d'achat)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Ex: Signaux Forex quotidiens"
                    value={formData.featureInput}
                    onChange={(e) => setFormData({ ...formData, featureInput: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); }}}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-3 py-1.5 rounded-lg font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                  >
                    Ajouter
                  </button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {formData.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px]">
                      <span className="truncate">{feat}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(idx)}
                        className="text-zinc-400 hover:text-red-500 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Formule active et visible sur le portail public
                </label>
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
                  {loading ? 'Enregistrement...' : editingPlan ? 'Mettre à jour' : 'Créer la formule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
