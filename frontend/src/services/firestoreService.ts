import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config.ts';
import { Group, Plan, Member, Subscription, Payment, AuditLog } from '../types/index.ts';

// Helper to generate IDs
function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// ----------------- GROUPS -----------------
export function subscribeGroups(
  adminId: string, 
  onData: (groups: Group[]) => void, 
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'groups'), where('adminId', '==', adminId));
  return onSnapshot(q, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach(docSnap => {
      groups.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    // Sort client side to avoid composite index requirement
    groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onData(groups);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'groups');
    onError?.(err);
  });
}

export function subscribePublicGroups(
  onData: (groups: Group[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'groups'), where('status', '==', 'active'));
  return onSnapshot(q, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach(docSnap => {
      groups.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onData(groups);
  }, (err) => {
    console.warn("Public groups fetch notice:", err.message);
    onError?.(err);
  });
}

export async function createGroup(adminId: string, data: Omit<Group, 'id' | 'adminId' | 'createdAt'>): Promise<string> {
  const id = genId('grp');
  const now = new Date().toISOString();
  const groupData: Group = {
    ...data,
    id,
    adminId,
    currency: 'GHS',
    status: data.status || 'active',
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'groups', id), groupData);
    await logAuditEvent(adminId, 'Création de groupe', 'Group', id, `Groupe WhatsApp "${data.name}" créé.`);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `groups/${id}`);
  }
}

export async function updateGroup(adminId: string, id: string, updates: Partial<Group>): Promise<void> {
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'groups', id), {
      ...updates,
      updatedAt: now
    });
    await logAuditEvent(adminId, 'Modification de groupe', 'Group', id, `Mise à jour du groupe ${updates.name || id}.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `groups/${id}`);
  }
}

export async function archiveGroup(adminId: string, id: string, currentStatus: 'active' | 'archived'): Promise<void> {
  const newStatus = currentStatus === 'active' ? 'archived' : 'active';
  await updateGroup(adminId, id, { status: newStatus });
}

// ----------------- PLANS -----------------
export function subscribePlans(
  adminId: string, 
  onData: (plans: Plan[]) => void, 
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'plans'), where('adminId', '==', adminId));
  return onSnapshot(q, (snapshot) => {
    const plans: Plan[] = [];
    snapshot.forEach(docSnap => {
      plans.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    plans.sort((a, b) => a.price - b.price);
    onData(plans);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'plans');
    onError?.(err);
  });
}

export function subscribePublicPlans(
  onData: (plans: Plan[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'plans'), where('isActive', '==', true));
  return onSnapshot(q, (snapshot) => {
    const plans: Plan[] = [];
    snapshot.forEach(docSnap => {
      plans.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    plans.sort((a, b) => a.price - b.price);
    onData(plans);
  }, (err) => {
    console.warn("Public plans fetch notice:", err.message);
    onError?.(err);
  });
}

export async function createPlan(adminId: string, data: Omit<Plan, 'id' | 'adminId' | 'createdAt'>): Promise<string> {
  const id = genId('plan');
  const now = new Date().toISOString();
  const planData: Plan = {
    ...data,
    id,
    adminId,
    currency: 'GHS',
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'plans', id), planData);
    await logAuditEvent(adminId, 'Création de formule', 'Plan', id, `Formule "${data.name}" à ${data.price} GHS (${data.durationDays} jours).`);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `plans/${id}`);
  }
}

export async function updatePlan(adminId: string, id: string, updates: Partial<Plan>): Promise<void> {
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'plans', id), {
      ...updates,
      updatedAt: now
    });
    await logAuditEvent(adminId, 'Modification de formule', 'Plan', id, `Mise à jour de la formule ${id}.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `plans/${id}`);
  }
}

// ----------------- MEMBERS -----------------
export function subscribeMembers(
  adminId: string, 
  onData: (members: Member[]) => void, 
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'members'), where('adminId', '==', adminId));
  return onSnapshot(q, (snapshot) => {
    const members: Member[] = [];
    snapshot.forEach(docSnap => {
      members.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    members.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onData(members);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'members');
    onError?.(err);
  });
}

export async function createMember(adminId: string, data: Omit<Member, 'id' | 'adminId' | 'createdAt'>): Promise<string> {
  const id = genId('mbr');
  const now = new Date().toISOString();
  const memberData: Member = {
    ...data,
    id,
    adminId,
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'members', id), memberData);
    await logAuditEvent(adminId, 'Ajout de membre', 'Member', id, `Membre "${data.displayName}" ajouté (${data.status}).`);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `members/${id}`);
  }
}

export async function updateMemberStatus(
  adminId: string, 
  id: string, 
  status: Member['status'], 
  notes?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const updates: Partial<Member> = { status, updatedAt: now };
    if (notes !== undefined) updates.notes = notes;
    await updateDoc(doc(db, 'members', id), updates);
    await logAuditEvent(adminId, 'Statut membre mis à jour', 'Member', id, `Statut passé à : ${status}.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `members/${id}`);
  }
}

// ----------------- PAYMENTS -----------------
export function subscribePayments(
  adminId: string, 
  onData: (payments: Payment[]) => void, 
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'payments'), where('adminId', '==', adminId));
  return onSnapshot(q, (snapshot) => {
    const payments: Payment[] = [];
    snapshot.forEach(docSnap => {
      payments.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onData(payments);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'payments');
    onError?.(err);
  });
}

export async function recordPayment(adminId: string, data: Omit<Payment, 'id' | 'createdAt' | 'adminId'>): Promise<string> {
  const id = genId('pay');
  const now = new Date().toISOString();
  const paymentData: Payment = {
    ...data,
    id,
    adminId,
    currency: 'GHS',
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'payments', id), paymentData);
    await logAuditEvent(
      adminId, 
      'Paiement enregistré', 
      'Payment', 
      id, 
      `Paiement ${data.amount} GHS (${data.provider} / ${data.channel}) - Statut : ${data.status}`
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `payments/${id}`);
  }
}

// ----------------- AUDIT LOGS -----------------
export function subscribeAuditLogs(
  adminId: string, 
  onData: (logs: AuditLog[]) => void, 
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'auditLogs'), where('adminId', '==', adminId));
  return onSnapshot(q, (snapshot) => {
    const logs: AuditLog[] = [];
    snapshot.forEach(docSnap => {
      logs.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onData(logs);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'auditLogs');
    onError?.(err);
  });
}

export async function logAuditEvent(
  adminId: string, 
  action: string, 
  entityType: string, 
  entityId: string, 
  details: string
): Promise<void> {
  const id = genId('log');
  const logData: AuditLog = {
    id,
    adminId,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'auditLogs', id), logData);
  } catch (error) {
    console.error('Erreur journalisation audit:', error);
  }
}

// ----------------- SEED INITIAL DEMO DATA IF EMPTY -----------------
export async function seedDemoDataIfEmpty(adminId: string): Promise<boolean> {
  try {
    const existing = await getDocs(query(collection(db, 'groups'), where('adminId', '==', adminId)));
    if (!existing.empty) return false;

    // Seed 2 default groups
    const grp1Id = await createGroup(adminId, {
      name: 'Accra Traders & Forex VIP 🇬🇭',
      description: 'Signaux quotidiens, analyses techniques et webinaires exclusifs en direct pour traders au Ghana.',
      category: 'Finance & Trading',
      inviteLink: 'https://chat.whatsapp.com/invitation-demo-accra-forex',
      accessInstructions: 'Bienvenue ! Dès confirmation de votre règlement Mobile Money en GHS, cliquez sur le lien ci-dessus pour rejoindre le groupe. Un administrateur vérifiera votre pseudo sous 15 minutes.',
      rules: '1. Respect mutuel et courtoisie.\n2. Aucun spam ou publicité non autorisée.\n3. Analyse des risques obligatoire.',
      currency: 'GHS',
      status: 'active'
    });

    const grp2Id = await createGroup(adminId, {
      name: 'Ghana E-Commerce Titans Club 🚀',
      description: 'Réseau d\'entrepreneurs e-commerce, importation Chine/Ghana, stratégie TikTok Shop & Facebook Ads.',
      category: 'Entrepreneuriat',
      inviteLink: 'https://chat.whatsapp.com/invitation-demo-ecommerce-ghana',
      accessInstructions: 'Merci de votre paiement. Enregistrez le numéro de l\'administrateur (+233 24 000 1122) et envoyez une capture ou votre nom pour validation instantanée.',
      rules: 'Partage d\'expériences constructives. Confidentialité des fournisseurs.',
      currency: 'GHS',
      status: 'active'
    });

    // Seed plans for grp1
    const plan1Id = await createPlan(adminId, {
      groupId: grp1Id,
      name: 'Accès Hebdomadaire (7 jours)',
      description: 'Idéal pour tester la rentabilité de nos signaux sans engagement à long terme.',
      price: 45,
      currency: 'GHS',
      durationDays: 7,
      isActive: true,
      features: ['Signaux Forex quotidiens', 'Support WhatsApp réactif', 'Alertes de session Londres/NY']
    });

    const plan2Id = await createPlan(adminId, {
      groupId: grp1Id,
      name: 'Abonnement Mensuel VIP (30 jours)',
      description: 'La formule la plus populaire avec accès complet au canal privé et webinaires du weekend.',
      price: 150,
      currency: 'GHS',
      durationDays: 30,
      isActive: true,
      features: ['Signaux Forex & Crypto complets', 'Webinaires en direct le samedi', 'Canal d\'analyses VIP', 'Assistance personnalisée']
    });

    const plan3Id = await createPlan(adminId, {
      groupId: grp1Id,
      name: 'Trimestre Élite (90 jours)',
      description: 'Économisez 70 GHS par rapport au mensuel. Inclus la formation complète en gestion du risque.',
      price: 380,
      currency: 'GHS',
      durationDays: 90,
      isActive: true,
      features: ['Accès prioritaire 3 mois', 'Guide PDF stratégies Forex 2026', 'Mentorat mensuel 1-on-1', 'Groupe d\'échange restreint']
    });

    // Seed sample members
    const now = new Date();
    const in25Days = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString();
    const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const past5Days = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

    await createMember(adminId, {
      groupId: grp1Id,
      displayName: 'Kofi Mensah (Accra)',
      phone: '+233 24 456 7890',
      email: 'kofi.mensah@example.com',
      status: 'active',
      currentPlanId: plan2Id,
      startDate: now.toISOString(),
      expiresAt: in25Days,
      notes: 'Paiement MTN MoMo validé'
    });

    await createMember(adminId, {
      groupId: grp1Id,
      displayName: 'Ama Serwaa',
      phone: '+233 20 876 5432',
      email: 'ama.serwaa@example.com',
      status: 'active',
      currentPlanId: plan1Id,
      startDate: now.toISOString(),
      expiresAt: in2Days, // Expiring soon!
      notes: 'Abonnement expire bientôt - Relance requise'
    });

    await createMember(adminId, {
      groupId: grp1Id,
      displayName: 'Kwame Osei',
      phone: '+233 27 123 4567',
      status: 'expired',
      currentPlanId: plan2Id,
      startDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: past5Days,
      notes: 'Abonnement terminé le mois dernier'
    });

    await createMember(adminId, {
      groupId: grp2Id,
      displayName: 'Abena Darko',
      phone: '+233 55 999 8877',
      status: 'active',
      currentPlanId: plan3Id,
      startDate: now.toISOString(),
      expiresAt: in60Days,
      notes: 'Membre Trimestre Club E-Commerce'
    });

    // Seed verified payments in GHS
    await recordPayment(adminId, {
      groupId: grp1Id,
      planId: plan2Id,
      amount: 150,
      currency: 'GHS',
      provider: 'paystack',
      providerReference: 'PST_GHS_INIT_DEMO_01',
      channel: 'mobile_money',
      momoProvider: 'MTN Mobile Money',
      customerName: 'Kofi Mensah (Accra)',
      customerPhone: '+233 24 456 7890',
      status: 'verified',
      isSandbox: true,
      verifiedAt: now.toISOString()
    });

    await recordPayment(adminId, {
      groupId: grp1Id,
      planId: plan1Id,
      amount: 45,
      currency: 'GHS',
      provider: 'paystack',
      providerReference: 'PST_GHS_INIT_DEMO_02',
      channel: 'mobile_money',
      momoProvider: 'Telecel Cash',
      customerName: 'Ama Serwaa',
      customerPhone: '+233 20 876 5432',
      status: 'verified',
      isSandbox: true,
      verifiedAt: now.toISOString()
    });

    await recordPayment(adminId, {
      groupId: grp2Id,
      planId: plan3Id,
      amount: 380,
      currency: 'GHS',
      provider: 'hubtel',
      providerReference: 'HUB_GHS_INIT_DEMO_03',
      channel: 'card',
      customerName: 'Abena Darko',
      customerPhone: '+233 55 999 8877',
      status: 'verified',
      isSandbox: true,
      verifiedAt: now.toISOString()
    });

    return true;
  } catch (error) {
    console.error('Erreur lors du seeding initial:', error);
    return false;
  }
}

// ----------------- WAPAY TRANSACTIONS FIRESTORE SYNC -----------------
export async function syncWaPayTransactionToFirestore(tx: any) {
  try {
    const docRef = doc(db, 'wapay_transactions', tx.id || tx.reference);
    await setDoc(docRef, {
      ...tx,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("Notice: Firestore transaction sync:", err);
    return false;
  }
}

export function subscribeWaPayTransactions(
  adminId: string,
  onData: (txs: any[]) => void
) {
  const q = query(collection(db, 'wapay_transactions'), where('adminId', '==', adminId));
  return onSnapshot(q, (snapshot) => {
    const txs: any[] = [];
    snapshot.forEach(docSnap => txs.push({ id: docSnap.id, ...docSnap.data() }));
    txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onData(txs);
  }, (err) => {
    console.warn("WaPay transactions listener notice:", err.message);
  });
}

// ----------------- WAPAY PAYOUTS FIRESTORE SYNC -----------------
export async function syncWaPayPayoutToFirestore(payout: any) {
  try {
    const docRef = doc(db, 'wapay_payouts', payout.id || payout.reference);
    await setDoc(docRef, {
      ...payout,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("Notice: Firestore payout sync:", err);
    return false;
  }
}

export function subscribeWaPayPayouts(
  adminId: string,
  onData: (payouts: any[]) => void
) {
  const q = query(collection(db, 'wapay_payouts'), where('adminId', '==', adminId));
  return onSnapshot(q, (snapshot) => {
    const payouts: any[] = [];
    snapshot.forEach(docSnap => payouts.push({ id: docSnap.id, ...docSnap.data() }));
    payouts.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    onData(payouts);
  }, (err) => {
    console.warn("WaPay payouts listener notice:", err.message);
  });
}

// ----------------- RENEWAL ALERTS FIRESTORE SYNC -----------------
export async function recordRenewalAlertInFirestore(alert: any) {
  try {
    const alertId = alert.id || `alert_${Date.now()}`;
    const docRef = doc(db, 'renewal_alerts', alertId);
    await setDoc(docRef, {
      ...alert,
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.warn("Notice: Firestore renewal alert record:", err);
    return false;
  }
}

