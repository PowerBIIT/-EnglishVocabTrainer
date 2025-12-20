'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Mic, MessageCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/vocabulary', icon: BookOpen, label: 'Słówka' },
  { href: '/pronunciation', icon: Mic, label: 'Wymowa' },
  { href: '/chat', icon: MessageCircle, label: 'Czat' },
  { href: '/settings', icon: Settings, label: 'Ustawienia' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-50">
      <div className="max-w-lg mx-auto px-4">
        <ul className="flex justify-around items-center h-16">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                >
                  <Icon
                    size={24}
                    className={cn(isActive && 'animate-bounce')}
                  />
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
