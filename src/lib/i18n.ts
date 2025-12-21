import { useVocabStore } from '@/lib/store';

export type AppLanguage = 'pl' | 'en';

export const useLanguage = () =>
  useVocabStore((state) => state.settings.general.language);
