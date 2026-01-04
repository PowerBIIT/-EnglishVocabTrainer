'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVocabStore, useHydration } from '@/lib/store';

type HealthResponse = { version?: string };

const FALLBACK_VERSION = process.env.NODE_ENV === 'development' ? 'dev' : '';

const normalizeVersion = (value?: string) => {
  const normalized = (value ?? '').trim();
  if (!normalized || normalized === 'unknown') return null;
  return normalized.startsWith('v') || normalized.startsWith('V') ? normalized : `v${normalized}`;
};

function useVersion(initialVersion?: string) {
  const [version, setVersion] = useState(() => normalizeVersion(initialVersion) ?? '');
  const shouldFetch = !normalizeVersion(initialVersion);

  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch('/api/health', { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as HealthResponse;
        const v = normalizeVersion(data?.version) ?? FALLBACK_VERSION;
        if (!cancelled) setVersion(v);
      } catch (e) {
        if (!cancelled && (e as Error).name !== 'AbortError') setVersion(FALLBACK_VERSION);
      }
    };

    load();
    return () => { cancelled = true; controller.abort(); };
  }, [shouldFetch]);

  return version;
}

const footerCopy = {
  pl: {
    privacy: 'Polityka Prywatnosci',
    terms: 'Regulamin',
    copyright: (year: number) => `${year} Henio`,
  },
  en: {
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    copyright: (year: number) => `${year} Henio`,
  },
  uk: {
    privacy: 'Polityka Konfidencijnosti',
    terms: 'Umovy Korystuvannya',
    copyright: (year: number) => `${year} Henio`,
  },
};

export function Footer() {
  const pathname = usePathname();
  const hydrated = useHydration();
  const language = useVocabStore((state) => state.settings.general.language);
  const t = footerCopy[language] ?? footerCopy.pl;
  const version = useVersion();

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
        <span>{t.copyright(year)}{version && ` · ${version}`}</span>
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
