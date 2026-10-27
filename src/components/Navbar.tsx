import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  LogIn, 
  LogOut,
  Smartphone,
  Globe,
  ChevronDown,
  Check,
  Shield
} from 'lucide-react';
import { User } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext.tsx';

export type ActiveTab = 'dashboard' | 'groups' | 'plans' | 'members' | 'payments' | 'wapay' | 'marketing' | 'settings' | 'audit' | 'join' | 'admin';

interface NavbarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isSandboxMode: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  darkMode,
  onToggleDarkMode,
  currentUser,
  onLogin,
  onLogout,
  isSandboxMode
}) => {
  const { lang, setLang, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-zinc-200 dark:border-zinc-800 transition-colors w-full shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand: ONLY the text "WTM" (no icon, no logo) */}
          <div className="flex items-center">
            <button 
              onClick={() => onSelectTab('dashboard')} 
              className="focus:outline-none group flex items-center"
              title="WTM - Accueil"
              aria-label="WTM Accueil"
            >
              <span className="font-black text-2xl sm:text-3xl tracking-tighter text-emerald-600 dark:text-emerald-400 group-hover:opacity-90 transition-opacity select-none">
                WTM
              </span>
            </button>
          </div>

          {/* Right Actions: Language Selector, Member Portal Icon, Dark Mode Toggle, Auth Profile */}
          <div className="flex items-center gap-2">
            
            {/* Language Dropdown Menu (English / French) */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                title={t('nav.selectLanguage', 'Choisir la langue')}
                aria-label={t('nav.selectLanguage', 'Choisir la langue')}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-bold shadow-2xs"
              >
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="uppercase tracking-wider">{lang}</span>
                <ChevronDown className={`w-3 h-3 text-zinc-400 shrink-0 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>

              {showLangMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-2xs" 
                    onClick={() => setShowLangMenu(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setLang('en');
                        setShowLangMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        lang === 'en' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold' 
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-lg shrink-0 leading-none inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs select-none">🇬🇧</span>
                        <span>English</span>
                      </span>
                      {lang === 'en' && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>

                    <button
                      onClick={() => {
                        setLang('fr');
                        setShowLangMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        lang === 'fr' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold' 
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-lg shrink-0 leading-none inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs select-none">🇫🇷</span>
                        <span>Français</span>
                      </span>
                      {lang === 'fr' && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Member Portal Icon Button */}
            <button
              onClick={() => onSelectTab('join')}
              title={t('nav.joinPortal', 'Portail Public d\'Adhésion Membre')}
              aria-label={t('nav.joinPortal', 'Portail Public d\'Adhésion Membre')}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                currentTab === 'join'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Smartphone className="w-5 h-5" />
            </button>

            {/* Master Admin Panel Button - Only visible when the admin (sbireino@gmail.com) is connected and not on public portal */}
            {currentUser?.email === 'sbireino@gmail.com' && currentTab !== 'join' && (
              <button
                onClick={() => onSelectTab('admin')}
                title="Panneau d'Administration Général (Réglages)"
                aria-label="Panneau d'Administration Général (Réglages)"
                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentTab === 'admin'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-md'
                    : 'text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Dark Mode Toggle Button */}
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none flex items-center justify-center"
              title={darkMode ? t('nav.lightMode', 'Passer en mode clair') : t('nav.darkMode', 'Passer en mode sombre')}
              aria-label={darkMode ? t('nav.lightMode', 'Passer en mode clair') : t('nav.darkMode', 'Passer en mode sombre')}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-5 h-5 text-zinc-600 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Auth Button or User Avatar */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-zinc-200 dark:border-zinc-800">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Admin'}
                    title={currentUser.displayName || currentUser.email || 'Admin'}
                    className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0"
                  />
                ) : (
                  <div 
                    title={currentUser.displayName || currentUser.email || 'Admin'}
                    className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0"
                  >
                    {(currentUser.displayName || currentUser.email || 'A')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title={t('nav.logout', 'Déconnexion')}
                  aria-label={t('nav.logout', 'Déconnexion')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="p-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center justify-center"
                title={t('nav.login', 'Connexion Administrateur')}
                aria-label={t('nav.login', 'Connexion Administrateur')}
              >
                <LogIn className="w-5 h-5" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
