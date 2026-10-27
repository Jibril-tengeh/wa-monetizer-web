import { Group, Plan, Member, Payment, AuditLog } from '../types/index.ts';

export const INITIAL_DEMO_GROUPS: Group[] = [
  {
    id: 'grp_demo_forex',
    adminId: 'admin_demo',
    name: 'Accra Traders & Forex VIP 🇬🇭',
    category: 'Finance & Trading',
    description: 'Signaux quotidiens, analyses techniques et webinaires exclusifs en direct pour traders au Ghana.',
    inviteLink: 'https://chat.whatsapp.com/demo-accra-forex-vip',
    accessInstructions: 'Bienvenue ! Dès confirmation de votre règlement Mobile Money en GHS, cliquez sur le lien ci-dessus pour rejoindre le groupe. Un administrateur vérifiera votre pseudo sous 15 minutes.',
    rules: '1. Respect mutuel et courtoisie.\n2. Aucun spam ou publicité non autorisée.\n3. Analyse des risques obligatoire.',
    currency: 'GHS',
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'grp_demo_ecommerce',
    adminId: 'admin_demo',
    name: 'Ghana E-Commerce Titans Club 🚀',
    category: 'Entrepreneuriat',
    description: 'Réseau d\'entrepreneurs e-commerce, importation Chine/Ghana, stratégie TikTok Shop & Facebook Ads.',
    inviteLink: 'https://chat.whatsapp.com/demo-ecommerce-ghana',
    accessInstructions: 'Merci de votre paiement. Enregistrez le numéro de l\'administrateur (+233 24 000 1122) et envoyez une capture ou votre nom pour validation instantanée.',
    rules: 'Partage d\'expériences constructives. Confidentialité des fournisseurs.',
    currency: 'GHS',
    status: 'active',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_DEMO_PLANS: Plan[] = [
  {
    id: 'plan_demo_hebdo',
    adminId: 'admin_demo',
    groupId: 'grp_demo_forex',
    name: 'Accès Hebdomadaire (7 jours)',
    description: 'Idéal pour tester la rentabilité de nos signaux sans engagement à long terme.',
    price: 45,
    currency: 'GHS',
    durationDays: 7,
    isActive: true,
    features: ['Signaux Forex quotidiens', 'Support WhatsApp réactif', 'Alertes sessions Londres/NY'],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'plan_demo_mensuel',
    adminId: 'admin_demo',
    groupId: 'grp_demo_forex',
    name: 'Abonnement Mensuel VIP (30 jours)',
    description: 'La formule la plus populaire avec accès complet au canal privé et webinaires.',
    price: 150,
    currency: 'GHS',
    durationDays: 30,
    isActive: true,
    features: ['Signaux Forex & Crypto complets', 'Webinaires en direct le samedi', 'Canal d\'analyses VIP', 'Assistance personnalisée'],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'plan_demo_ecom_mensuel',
    adminId: 'admin_demo',
    groupId: 'grp_demo_ecommerce',
    name: 'Pass Mensuel Titans Club (30 jours)',
    description: 'Accès mensuel aux stratégies d\'importation Chine/Ghana et networking e-commerce.',
    price: 140,
    currency: 'GHS',
    durationDays: 30,
    isActive: true,
    features: ['Réseau d\'acheteurs Chine/Ghana', 'Live hebdomadaire TikTok Shop', 'Entraide logistique & dédouanement'],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'plan_demo_trimestre',
    adminId: 'admin_demo',
    groupId: 'grp_demo_ecommerce',
    name: 'Trimestre Élite E-commerce (90 jours)',
    description: 'Accompagnement intensif de 3 mois pour scaler votre boutique e-commerce au Ghana.',
    price: 380,
    currency: 'GHS',
    durationDays: 90,
    isActive: true,
    features: ['Accès prioritaire 3 mois', 'Fournisseurs vérifiés Ghana & Chine', 'Mentorat mensuel', 'Groupe d\'échange restreint'],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const now = new Date();
export const INITIAL_DEMO_MEMBERS: Member[] = [
  {
    id: 'mbr_demo_1',
    adminId: 'admin_demo',
    groupId: 'grp_demo_forex',
    displayName: 'Kofi Mensah (Accra)',
    phone: '+233 24 456 7890',
    email: 'kofi.mensah@example.com',
    status: 'active',
    currentPlanId: 'plan_demo_mensuel',
    startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Paiement MTN MoMo validé',
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mbr_demo_2',
    adminId: 'admin_demo',
    groupId: 'grp_demo_forex',
    displayName: 'Ama Serwaa',
    phone: '+233 20 876 5432',
    email: 'ama.serwaa@example.com',
    status: 'active',
    currentPlanId: 'plan_demo_hebdo',
    startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Expiring in 2 days!
    notes: 'Relance requise pour renouvellement',
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mbr_demo_3',
    adminId: 'admin_demo',
    groupId: 'grp_demo_forex',
    displayName: 'Kwame Osei',
    phone: '+233 27 123 4567',
    status: 'expired',
    currentPlanId: 'plan_demo_mensuel',
    startDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Abonnement terminé le mois dernier',
    createdAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mbr_demo_4',
    adminId: 'admin_demo',
    groupId: 'grp_demo_ecommerce',
    displayName: 'Abena Darko',
    phone: '+233 55 999 8877',
    status: 'active',
    currentPlanId: 'plan_demo_trimestre',
    startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Membre Trimestre Club E-Commerce',
    createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_DEMO_PAYMENTS: Payment[] = [
  {
    id: 'pay_demo_1',
    adminId: 'admin_demo',
    groupId: 'grp_demo_forex',
    planId: 'plan_demo_mensuel',
    amount: 150,
    currency: 'GHS',
    provider: 'paystack',
    providerReference: 'PST_GHS_MOCK_101',
    channel: 'mobile_money',
    momoProvider: 'MTN Mobile Money',
    customerName: 'Kofi Mensah (Accra)',
    customerPhone: '+233 24 456 7890',
    status: 'verified',
    isSandbox: true,
    verifiedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pay_demo_2',
    adminId: 'admin_demo',
    groupId: 'grp_demo_forex',
    planId: 'plan_demo_hebdo',
    amount: 45,
    currency: 'GHS',
    provider: 'paystack',
    providerReference: 'PST_GHS_MOCK_102',
    channel: 'mobile_money',
    momoProvider: 'Telecel Cash',
    customerName: 'Ama Serwaa',
    customerPhone: '+233 20 876 5432',
    status: 'verified',
    isSandbox: true,
    verifiedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pay_demo_3',
    adminId: 'admin_demo',
    groupId: 'grp_demo_ecommerce',
    planId: 'plan_demo_trimestre',
    amount: 380,
    currency: 'GHS',
    provider: 'hubtel',
    providerReference: 'HUB_GHS_MOCK_103',
    channel: 'card',
    customerName: 'Abena Darko',
    customerPhone: '+233 55 999 8877',
    status: 'verified',
    isSandbox: true,
    verifiedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_DEMO_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_demo_1',
    adminId: 'admin_demo',
    action: 'Création de groupe',
    entityType: 'Group',
    entityId: 'grp_demo_forex',
    details: 'Groupe WhatsApp "Accra Traders & Forex VIP 🇬🇭" initialisé.',
    createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log_demo_2',
    adminId: 'admin_demo',
    action: 'Paiement vérifié',
    entityType: 'Payment',
    entityId: 'pay_demo_1',
    details: 'Paiement de 150 GHS reçu via MTN Mobile Money pour Kofi Mensah.',
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];
