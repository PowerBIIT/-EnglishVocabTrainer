import type { AppLanguage } from '@/lib/i18n';

const CATEGORY_LABELS_PL: Record<string, string> = {
  'Health Problems': 'Zdrowie',
  Collocations: 'Zwroty',
  Food: 'Jedzenie',
  Travel: 'Podróże',
};

const CATEGORY_LABELS_UK: Record<string, string> = {
  'Health Problems': 'Здоровʼя',
  Collocations: 'Сталi вирази',
  Food: 'Їжа',
  Travel: 'Подорожі',
};

export function getCategoryLabel(category: string, language: AppLanguage = 'pl') {
  if (language === 'en') {
    return category;
  }
  if (language === 'uk') {
    return CATEGORY_LABELS_UK[category] ?? category;
  }
  return CATEGORY_LABELS_PL[category] ?? category;
}
