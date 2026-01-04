import type { AppLanguage } from '@/lib/i18n';

const CATEGORY_LABELS_PL: Record<string, string> = {
  'Health Problems': 'Zdrowie',
  Collocations: 'Zwroty',
  Food: 'Jedzenie',
  Travel: 'Podróże',
  // Ukrainian categories -> Polish
  'документи та установи': 'Dokumenty i urzędy',
  'школа': 'Szkoła',
  'лікар і здоровʼя': 'Lekarz i zdrowie',
  'транспорт і місто': 'Transport i miasto',
};

const CATEGORY_LABELS_UK: Record<string, string> = {
  'Health Problems': 'Здоровʼя',
  Collocations: 'Сталi вирази',
  Food: 'Їжа',
  Travel: 'Подорожі',
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  // Ukrainian categories -> English
  'документи та установи': 'Documents & offices',
  'школа': 'School',
  'лікар і здоровʼя': 'Doctor & health',
  'транспорт і місто': 'Transport & city',
};

export function getCategoryLabel(category: string, language: AppLanguage = 'pl') {
  if (language === 'en') {
    return CATEGORY_LABELS_EN[category] ?? category;
  }
  if (language === 'uk') {
    return CATEGORY_LABELS_UK[category] ?? category;
  }
  return CATEGORY_LABELS_PL[category] ?? category;
}
