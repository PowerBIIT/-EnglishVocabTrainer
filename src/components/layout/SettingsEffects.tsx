'use client';

import { useEffect } from 'react';
import { useHydration, useVocabStore } from '@/lib/store';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia(DARK_QUERY).matches;
  const resolved = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme;
  root.classList.toggle('dark', resolved === 'dark');
};

export function SettingsEffects() {
  const hydrated = useHydration();
  const language = useVocabStore((state) => state.settings.general.language);
  const theme = useVocabStore((state) => state.settings.general.theme);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = language;
  }, [hydrated, language]);

  useEffect(() => {
    if (!hydrated) return;

    applyTheme(theme);
    if (theme !== 'auto') return;

    const media = window.matchMedia(DARK_QUERY);
    const handler = () => applyTheme('auto');

    if (media.addEventListener) {
      media.addEventListener('change', handler);
    } else {
      media.addListener(handler);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handler);
      } else {
        media.removeListener(handler);
      }
    };
  }, [hydrated, theme]);

  return null;
}
