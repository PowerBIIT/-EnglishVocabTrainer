'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, BookOpen, Mic, MessageCircle, UserCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVocabStore } from '@/lib/store';

const navLabels = {
  pl: {
    brand: 'Trener',
    home: 'Start',
    vocabulary: 'Słówka',
    pronunciation: 'Wymowa',
    chat: 'Czat',
    profile: 'Profil',
    admin: 'Admin',
  },
  en: {
    brand: 'Trainer',
    home: 'Home',
    vocabulary: 'Vocabulary',
    pronunciation: 'Pronunciation',
    chat: 'Chat',
    profile: 'Profile',
    admin: 'Admin',
  },
  uk: {
    brand: 'Тренер',
    home: 'Старт',
    vocabulary: 'Слова',
    pronunciation: 'Вимова',
    chat: 'Чат',
    profile: 'Профіль',
    admin: 'Адмін',
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
  const labels = navLabels[language] ?? navLabels.pl;
  const isAdmin = Boolean(session?.user?.isAdmin);

  if (pathname === '/login' || pathname === '/onboarding' || pathname === '/waitlist') {
    return null;
  }

  const items = isAdmin
    ? [...navItems, { href: '/admin', icon: Shield, key: 'admin' as const }]
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:right-auto md:h-screen md:w-24 bg-white/90 dark:bg-slate-900/90 border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-700 backdrop-blur z-50 pb-[env(safe-area-inset-bottom)] md:pb-0">
      <div className="max-w-lg md:max-w-none mx-auto px-4 md:px-0 h-full">
        <div className="h-full flex md:flex-col md:items-center md:py-6 md:gap-6">
          <div className="hidden md:flex flex-col items-center gap-2 text-primary-600">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center font-display text-lg">
              EV
            </div>
            <span className="text-xs text-slate-500">{labels.brand}</span>
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
                        ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
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
