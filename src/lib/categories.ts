export const CATEGORY_LABELS: Record<string, string> = {
  'Health Problems': 'Zdrowie',
  Collocations: 'Zwroty',
  Food: 'Jedzenie',
  Travel: 'Podróże',
};

export function getCategoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}
