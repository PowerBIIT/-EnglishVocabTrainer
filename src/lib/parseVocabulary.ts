import type { VocabularyItem } from '@/types';

export type ParsedVocabularyWord = Pick<
  VocabularyItem,
  'en' | 'pl' | 'phonetic' | 'difficulty'
>;

export const parseVocabularyInput = (text: string): ParsedVocabularyWord[] => {
  const words: ParsedVocabularyWord[] = [];
  const parts = text.split(/[,\n]+/);

  for (const part of parts) {
    const match = part.match(/([^-=]+)[-=](.+)/);
    if (!match) continue;

    const en = match[1].trim();
    const pl = match[2].trim();

    if (!en || !pl || en.length < 2 || pl.length < 2) {
      continue;
    }

    words.push({
      en,
      pl,
      phonetic: `/${en.toLowerCase()}/`,
      difficulty: 'medium',
    });
  }

  return words;
};
