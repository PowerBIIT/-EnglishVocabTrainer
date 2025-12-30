'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVocabStore, useHydration } from '@/lib/store';

const footerCopy = {
  pl: {
    privacy: 'Polityka Prywatnosci',
    terms: 'Regulamin',
    copyright: (year: number) => `${year} English Vocab Trainer`,
  },
  en: {
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    copyright: (year: number) => `${year} English Vocab Trainer`,
  },
  uk: {
    privacy: 'Polityka Konfidencijnosti',
    terms: 'Umovy Korystuvannya',
    copyright: (year: number) => `${year} English Vocab Trainer`,
  },
};

export function Footer() {
  const pathname = usePathname();
  const hydrated = useHydration();
  const language = useVocabStore((state) => state.settings.general.language);
  const t = footerCopy[language] ?? footerCopy.pl;

  // Hide on full-screen pages
  const hiddenPaths = ['/login', '/onboarding', '/waitlist', '/privacy', '/terms'];
  if (hiddenPaths.includes(pathname)) {
    return null;
  }

  // Don't render until hydrated to avoid hydration mismatch
  if (!hydrated) {
    return null;
  }

  const year = new Date().getFullYear();

  return (
    <footer className="hidden md:block fixed bottom-0 left-24 right-0 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 py-3 px-6 backdrop-blur-sm z-40">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{t.copyright(year)}</span>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            {t.privacy}
          </Link>
          <Link
            href="/terms"
            className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            {t.terms}
          </Link>
        </div>
      </div>
    </footer>
  );
}
