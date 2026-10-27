import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Package, 
  Settings, 
  ShieldCheck, 
  MessageCircle,
  Tag 
} from 'lucide-react';
import { ActiveTab } from './Navbar.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface BottomNavProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, isAdmin }) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: t('nav.dashboard', 'Tableau de bord'), icon: LayoutDashboard },
    { id: 'groups' as ActiveTab, label: t('nav.groups', 'Groupes WhatsApp'), icon: MessageCircle },
    { id: 'plans' as ActiveTab, label: t('nav.plans', 'Formules & Tarifs'), icon: Package },
    { id: 'members' as ActiveTab, label: t('nav.members', 'Membres'), icon: Users },
    { id: 'wapay' as ActiveTab, label: t('nav.wapay', 'SBI Pay (FinTech)'), icon: CreditCard },
    ...(isAdmin && currentTab !== 'join' ? [{ id: 'admin' as ActiveTab, label: 'Admin Panel', icon: ShieldCheck }] : []),
    { id: 'settings' as ActiveTab, label: t('nav.settings', 'Paramètres'), icon: Settings },
  ];

  return (
    <nav 
      aria-label="Navigation principale inférieure"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-zinc-200 dark:border-zinc-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.4)] transition-colors w-full max-w-full overflow-hidden select-none"
    >
      <div className="max-w-lg mx-auto px-2 sm:px-6 py-1.5 sm:py-2 flex items-center justify-around sm:justify-between gap-0.5 sm:gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={item.label}
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 sm:px-3 rounded-2xl transition-all duration-200 select-none ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {isActive && (
                <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300 dark:bg-emerald-300 shadow-xs" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
