import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  auth, 
  loginWithGoogle, 
  logoutUser, 
  testFirestoreConnection 
} from './firebase/config.ts';
import { 
  subscribeGroups, 
  subscribePublicGroups,
  createGroup, 
  updateGroup, 
  archiveGroup, 
  subscribePlans, 
  subscribePublicPlans,
  createPlan, 
  updatePlan, 
  subscribeMembers, 
  createMember, 
  updateMemberStatus, 
  subscribePayments, 
  recordPayment, 
  subscribeAuditLogs, 
  seedDemoDataIfEmpty 
} from './services/firestoreService.ts';
import { 
  INITIAL_DEMO_GROUPS, 
  INITIAL_DEMO_PLANS, 
  INITIAL_DEMO_MEMBERS, 
  INITIAL_DEMO_PAYMENTS, 
  INITIAL_DEMO_AUDIT_LOGS 
} from './utils/mockData.ts';
import { Group, Plan, Member, Payment, AuditLog } from './types/index.ts';
import { Navbar, ActiveTab } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { GroupsView } from './components/GroupsView.tsx';
import { PlansView } from './components/PlansView.tsx';
import { MembersView } from './components/MembersView.tsx';
import { PaymentsView } from './components/PaymentsView.tsx';
import { WaPayDashboardView } from './components/WaPayDashboardView.tsx';
import { PublicJoinView } from './components/PublicJoinView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { MarketingView } from './components/MarketingView.tsx';
import { AccessLandingView } from './components/AccessLandingView.tsx';
import { AdminPanelMasterView } from './components/AdminPanelMasterView.tsx';
import { useLanguage } from './context/LanguageContext.tsx';
import { 
  ShieldCheck, 
  LogIn, 
  MessageCircle, 
  Smartphone, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  FlaskConical,
  Lock
} from 'lucide-react';

export default function App() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('wtm_theme');
        if (saved) return saved === 'dark';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return false;
  });
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [targetCheckoutGroupId, setTargetCheckoutGroupId] = useState<string | undefined>(undefined);
  const [isDemoPreviewActive, setIsDemoPreviewActive] = useState(false);
  const [accessLandingToken, setAccessLandingToken] = useState<string | null>(null);

  // Firestore Data State
  const [groups, setGroups] = useState<Group[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Admin Global Settings State
  const [adminSettings, setAdminSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('wtm_admin_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) {
          setAdminSettings(d.settings);
          try {
            localStorage.setItem('wtm_admin_settings', JSON.stringify(d.settings));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Toggle Dark Mode
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('wtm_theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('wtm_theme', 'light');
    }
  }, [darkMode]);

  // Check URL params and hash for direct public checkout navigation or single-use OTP link
  useEffect(() => {
    const handleLocationChange = () => {
      const currentHash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      
      // Check for single-use OTP token link (#access?token=... or ?token=...)
      if (currentHash.includes('access') && currentHash.includes('token=')) {
        const match = currentHash.match(/token=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) setAccessLandingToken(match[1]);
      } else if (urlParams.get('token')) {
        setAccessLandingToken(urlParams.get('token'));
      }

      // Check for direct join navigation (#join?groupId=...)
      if (currentHash.includes('join') || urlParams.get('view') === 'join') {
        setCurrentTab('join');
        let gid = urlParams.get('groupId');
        if (!gid && currentHash.includes('groupId=')) {
          const hashQuery = currentHash.includes('?') ? currentHash.split('?')[1] : currentHash.replace(/^#/, '');
          gid = new URLSearchParams(hashQuery).get('groupId');
        }
        if (gid) setTargetCheckoutGroupId(gid);
      }

      // Check for direct admin navigation (#admin or ?tab=admin or ?view=admin)
      if (currentHash.includes('admin') || urlParams.get('tab') === 'admin' || urlParams.get('view') === 'admin') {
        setCurrentTab('admin');
      }
    };

    handleLocationChange();
    window.addEventListener('hashchange', handleLocationChange);
    return () => window.removeEventListener('hashchange', handleLocationChange);
  }, []);

  // 1. Initial Connection Test (Firebase Skill Mandate)
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      if (connected) {
        console.log("Connexion Cloud Firestore établie avec succès.");
      }
    });
  }, []);

  // 2. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        setIsDemoPreviewActive(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Firestore Real-Time Subscriptions: CRITICAL RULE - ONLY ATTACH WHEN AUTHENTICATED
  useEffect(() => {
    if (authLoading) return;

    // If unauthenticated: DO NOT ATTACH PROTECTED LISTENERS
    if (!currentUser) {
      if (isDemoPreviewActive) {
        // Load in-memory demo data without querying restricted Firestore paths
        setGroups(INITIAL_DEMO_GROUPS);
        setPlans(INITIAL_DEMO_PLANS);
        setMembers(INITIAL_DEMO_MEMBERS);
        setPayments(INITIAL_DEMO_PAYMENTS);
        setAuditLogs(INITIAL_DEMO_AUDIT_LOGS);
        setDataLoading(false);
      } else if (currentTab === 'join') {
        // Public Join page: subscribe to public active groups and plans only
        const unsubPublicGroups = subscribePublicGroups((data) => {
          setGroups(data.length > 0 ? data : INITIAL_DEMO_GROUPS);
          setDataLoading(false);
        });
        const unsubPublicPlans = subscribePublicPlans((data) => {
          setPlans(data.length > 0 ? data : INITIAL_DEMO_PLANS);
        });
        return () => {
          unsubPublicGroups();
          unsubPublicPlans();
        };
      } else {
        setDataLoading(false);
      }
      return;
    }

    // User is signed in: attach authenticated listeners scoped to currentUser.uid
    const adminId = currentUser.uid;
    setDataLoading(true);

    const unsubGroups = subscribeGroups(adminId, (data) => {
      setGroups(data);
      setDataLoading(false);
      // Auto seed if admin's collection is empty
      if (data.length === 0) {
        seedDemoDataIfEmpty(adminId);
      }
    });

    const unsubPlans = subscribePlans(adminId, (data) => {
      setPlans(data);
    });

    const unsubMembers = subscribeMembers(adminId, (data) => {
      setMembers(data);
    });

    const unsubPayments = subscribePayments(adminId, (data) => {
      setPayments(data);
    });

    const unsubAudit = subscribeAuditLogs(adminId, (data) => {
      setAuditLogs(data);
    });

    return () => {
      unsubGroups();
      unsubPlans();
      unsubMembers();
      unsubPayments();
      unsubAudit();
    };
  }, [authLoading, currentUser, isDemoPreviewActive, currentTab]);

  // Handlers
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e: any) {
      alert(`Erreur de connexion : ${e.message}`);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setIsDemoPreviewActive(false);
  };

  const handleCreateGroup = async (data: Omit<Group, 'id' | 'adminId' | 'createdAt'>) => {
    if (!currentUser) {
      alert("Veuillez vous connecter avec Google pour enregistrer un groupe dans Cloud Firestore.");
      return;
    }
    await createGroup(currentUser.uid, data);
  };

  const handleUpdateGroup = async (id: string, data: Partial<Group>) => {
    if (!currentUser) return;
    await updateGroup(currentUser.uid, id, data);
  };

  const handleArchiveGroup = async (id: string, currentStatus: 'active' | 'archived') => {
    if (!currentUser) return;
    await archiveGroup(currentUser.uid, id, currentStatus);
  };

  const handleCreatePlan = async (data: Omit<Plan, 'id' | 'adminId' | 'createdAt'>) => {
    if (!currentUser) {
      alert("Veuillez vous connecter avec Google pour créer une formule.");
      return;
    }
    await createPlan(currentUser.uid, data);
  };

  const handleUpdatePlan = async (id: string, data: Partial<Plan>) => {
    if (!currentUser) return;
    await updatePlan(currentUser.uid, id, data);
  };

  const handleTogglePlanActive = async (id: string, currentActive: boolean) => {
    if (!currentUser) return;
    await updatePlan(currentUser.uid, id, { isActive: !currentActive });
  };

  const handleCreateMember = async (data: Omit<Member, 'id' | 'adminId' | 'createdAt'>) => {
    if (!currentUser) {
      alert("Veuillez vous connecter avec Google pour ajouter un membre.");
      return;
    }
    await createMember(currentUser.uid, data);
  };

  const handleUpdateMemberStatus = async (id: string, status: any, notes?: string) => {
    if (!currentUser) return;
    await updateMemberStatus(currentUser.uid, id, status, notes);
  };

  const handleVerifyPaymentOnServer = async (reference: string, provider: string) => {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, provider })
    });
    return await res.json();
  };

  const handleNavigateToCheckout = (groupId: string) => {
    setTargetCheckoutGroupId(groupId);
    setCurrentTab('join');
  };

  const handleSeedDemoData = async () => {
    if (!currentUser) {
      setIsDemoPreviewActive(true);
      return;
    }
    await seedDemoDataIfEmpty(currentUser.uid);
  };

  // Loading spinner during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl animate-bounce mb-4">
          <MessageCircle className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-zinc-500">Chargement de WA Monetizer...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors antialiased">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab !== 'join') setTargetCheckoutGroupId(undefined);
          setCurrentTab(tab);
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isSandboxMode={true}
      />

      {/* Dynamic Flash Announcement Banner */}
      {adminSettings?.announcement?.enabled && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-xs transition-all">
          <Sparkles className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
          <span>{adminSettings.announcement.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full min-w-0 mx-auto px-3.5 sm:px-6 lg:px-8 pb-28 sm:pb-32 overflow-x-hidden ${adminSettings?.announcement?.enabled ? 'pt-26 sm:pt-30' : 'pt-20 sm:pt-24'}`}>
        
        {/* If user clicked a single-use token invite link (#access?token=...) */}
        {accessLandingToken ? (
          <AccessLandingView
            token={accessLandingToken}
            onNavigateHome={() => {
              setAccessLandingToken(null);
              window.location.hash = '';
              setCurrentTab('dashboard');
            }}
          />
        ) : !currentUser && currentTab !== 'join' && currentTab !== 'admin' && !isDemoPreviewActive ? (
          <div className="max-w-2xl mx-auto py-10 px-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 sm:p-10 shadow-xl text-center space-y-6">
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {t('auth.welcomeTitle', 'Espace Administrateur Sécurisé')}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-3 tracking-tight">
                  {t('auth.welcomeTitle', 'Connectez-vous à WA Monetizer')}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                  {t('auth.welcomeSub', 'Accédez à la gestion de vos groupes WhatsApp, vos membres abonnés et l\'encaissement de vos revenus en Cedi ghanéen (GH₵).')}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleLogin}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('auth.loginGoogle', 'Se connecter avec Google (Admin)')}</span>
                </button>

                <button
                  onClick={() => setIsDemoPreviewActive(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{t('auth.exploreDemo', 'Explorer la Démo (Hors-connexion)')}</span>
                </button>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
                <button
                  onClick={() => setCurrentTab('join')}
                  className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1.5"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{t('auth.viewPublicPortal', 'Voir la page d\'adhésion membre (Portail Public)')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">•</span>

                <button
                  onClick={() => setCurrentTab('admin')}
                  className="text-zinc-700 dark:text-zinc-300 font-bold hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Panneau d'Administration (Réglages)</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-[11px] text-zinc-400 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{t('auth.securityNote', 'Règles de sécurité Firestore activées • Isolation multi-tenant par UID')}</span>
              </div>

            </div>
          </div>
        ) : (
          <>
            {/* Demo Preview Banner if exploring unauthenticated */}
            {isDemoPreviewActive && !currentUser && currentTab !== 'join' && (
              <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs w-full min-w-0">
                <div className="flex items-start sm:items-center gap-2.5 text-amber-800 dark:text-amber-200 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="leading-snug break-words">
                    <strong>{t('common.demo', 'Mode Découverte')} :</strong> {t('auth.demoBanner', 'Vous explorez des données d\'exemple en mémoire. Connectez-vous avec Google pour synchroniser vos vrais groupes dans Cloud Firestore.')}
                  </span>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shrink-0 transition-colors text-center"
                >
                  {t('auth.demoLoginBtn', 'Se connecter')}
                </button>
              </div>
            )}

            {currentTab === 'dashboard' && (
              <DashboardView
                groups={groups}
                plans={plans}
                members={members}
                payments={payments}
                onNavigate={(tab) => setCurrentTab(tab)}
                onOpenNewGroup={() => setCurrentTab('groups')}
                onOpenNewPlan={() => setCurrentTab('plans')}
                onOpenNewMember={() => setCurrentTab('members')}
                isSandboxMode={true}
              />
            )}

            {currentTab === 'groups' && (
              <GroupsView
                groups={groups}
                plans={plans}
                onCreateGroup={handleCreateGroup}
                onUpdateGroup={handleUpdateGroup}
                onArchiveGroup={handleArchiveGroup}
                onNavigateToCheckout={handleNavigateToCheckout}
              />
            )}

            {currentTab === 'plans' && (
              <PlansView
                plans={plans}
                groups={groups}
                onCreatePlan={handleCreatePlan}
                onUpdatePlan={handleUpdatePlan}
                onToggleActive={handleTogglePlanActive}
              />
            )}

            {currentTab === 'members' && (
              <MembersView
                members={members}
                groups={groups}
                plans={plans}
                onCreateMember={handleCreateMember}
                onUpdateMemberStatus={handleUpdateMemberStatus}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView
                payments={payments}
                onVerifyPaymentOnServer={handleVerifyPaymentOnServer}
                isSandboxMode={true}
              />
            )}

            {currentTab === 'wapay' && (
              <WaPayDashboardView
                onNavigateToPublicJoin={() => setCurrentTab('join')}
              />
            )}

            {currentTab === 'join' && (
              <PublicJoinView
                groups={groups}
                plans={plans}
                preselectedGroupId={targetCheckoutGroupId}
                isSandboxMode={true}
              />
            )}

            {currentTab === 'marketing' && (
              <MarketingView
                isSandboxMode={true}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                isSandboxMode={true}
                onSeedDemoData={handleSeedDemoData}
              />
            )}

            {currentTab === 'audit' && (
              <AuditLogsView
                logs={auditLogs}
              />
            )}

            {currentTab === 'admin' && (
              <AdminPanelMasterView
                groups={groups}
                plans={plans}
                members={members}
                payments={payments}
                isSandboxMode={true}
                onRefreshData={() => {
                  fetch('/api/admin/config')
                    .then(r => r.json())
                    .then(d => {
                      if (d.success && d.settings) setAdminSettings(d.settings);
                    })
                    .catch(() => {});
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation Header with Section Icons */}
      <BottomNav
        currentTab={currentTab}
        isAdmin={currentUser?.email === 'sbireino@gmail.com'}
        onSelectTab={(tab) => {
          if (tab !== 'join') setTargetCheckoutGroupId(undefined);
          setCurrentTab(tab);
        }}
      />

    </div>
  );
}
