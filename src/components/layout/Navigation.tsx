'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, BookOpen, Mic, MessageCircle, UserCircle, Shield, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVocabStore } from '@/lib/store';

const navLabels = {
  pl: {
    brand: 'Trener',
    home: 'Start',
    vocabulary: 'Słówka',
    pronunciation: 'Wymowa',
    chat: 'Czat AI',
    profile: 'Profil',
    admin: 'Admin',
    theme: 'Motyw',
    themeLight: 'Jasny',
    themeDark: 'Ciemny',
    themeAuto: 'Auto',
  },
  en: {
    brand: 'Trainer',
    home: 'Home',
    vocabulary: 'Vocabulary',
    pronunciation: 'Pronunciation',
    chat: 'AI Chat',
    profile: 'Profile',
    admin: 'Admin',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeAuto: 'Auto',
  },
  uk: {
    brand: 'Тренер',
    home: 'Старт',
    vocabulary: 'Слова',
    pronunciation: 'Вимова',
    chat: 'AI Чат',
    profile: 'Профіль',
    admin: 'Адмін',
    theme: 'Тема',
    themeLight: 'Світла',
    themeDark: 'Темна',
    themeAuto: 'Авто',
  },
} as const;

const navItems = [
  { href: '/', icon: Home, key: 'home' },
  { href: '/vocabulary', icon: BookOpen, key: 'vocabulary' },
  { href: '/pronunciation', icon: Mic, key: 'pronunciation' },
  { href: '/chat', icon: MessageCircle, key: 'chat' },
  { href: '/profile', icon: UserCircle, key: 'profile' },
] as const;

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const language = useVocabStore((state) => state.settings.general.language);
  const theme = useVocabStore((state) => state.settings.general.theme);
  const updateSettings = useVocabStore((state) => state.updateSettings);
  const labels = navLabels[language] ?? navLabels.pl;
  const isAdmin = Boolean(session?.user?.isAdmin);

  if (pathname === '/login' || pathname === '/onboarding' || pathname === '/waitlist') {
    return null;
  }

  const items = isAdmin
    ? [...navItems, { href: '/admin', icon: Shield, key: 'admin' as const }]
    : navItems;

  const themeLabel =
    theme === 'dark' ? labels.themeDark : theme === 'light' ? labels.themeLight : labels.themeAuto;
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
  const ThemeIcon =
    theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const handleToggleTheme = () =>
    updateSettings('general', {
      theme: nextTheme,
    });

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:right-auto md:h-screen md:w-24 bg-white/80 dark:bg-slate-900/80 border-t md:border-t-0 md:border-r border-primary-100/50 dark:border-primary-900/50 backdrop-blur-xl z-50 pb-[env(safe-area-inset-bottom)] md:pb-0 shadow-lg shadow-primary-500/5">
      <div className="max-w-lg md:max-w-none mx-auto px-4 md:px-0 h-full">
        <div className="h-full flex md:flex-col md:items-center md:py-6 md:gap-6">
          <div className="hidden md:flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center font-display text-lg text-white shadow-lg shadow-primary-500/30">
              H
            </div>
            <span className="text-xs font-medium bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{labels.brand}</span>
            <button
              type="button"
              onClick={handleToggleTheme}
              title={`${labels.theme}: ${themeLabel}`}
              aria-label={`${labels.theme}: ${themeLabel}`}
              className={cn(
                'mt-1 flex items-center justify-center w-9 h-9 rounded-xl transition-all',
                'text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20'
              )}
            >
              <ThemeIcon size={18} />
            </button>
          </div>
          <ul className="flex justify-around items-center h-[calc(4rem+env(safe-area-inset-bottom))] md:h-auto md:flex-col md:gap-3 md:mt-4 w-full">
            {items.map(({ href, icon: Icon, key }) => {
              const isActive = pathname === href;
              const label = labels[key];
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all',
                      isActive
                        ? 'bg-gradient-to-br from-primary-100 to-pink-100 dark:from-primary-900/60 dark:to-pink-900/40 text-primary-700 dark:text-primary-300 shadow-md shadow-primary-500/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20'
                    )}
                  >
                    <Icon size={22} className={cn(isActive && 'scale-110')} />
                    <span className="text-[11px] font-medium">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
