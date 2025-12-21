import type { AppLanguage } from '@/lib/i18n';

const CATEGORY_LABELS_PL: Record<string, string> = {
  'Health Problems': 'Zdrowie',
  Collocations: 'Zwroty',
  Food: 'Jedzenie',
  Travel: 'Podróże',
};

export function getCategoryLabel(category: string, language: AppLanguage = 'pl') {
  if (language === 'en') {
    return category;
  }
  return CATEGORY_LABELS_PL[category] ?? category;
}
