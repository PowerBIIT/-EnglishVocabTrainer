import { useVocabStore } from '@/lib/store';

export type AppLanguage = 'pl' | 'en' | 'uk';

export const isAppLanguage = (value?: string): value is AppLanguage =>
  value === 'pl' || value === 'en' || value === 'uk';

export const useLanguage = () =>
  useVocabStore((state) => state.settings.general.language);
