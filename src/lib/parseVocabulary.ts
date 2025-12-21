export interface ParsedVocabularyWord {
  target: string;
  native: string;
  phonetic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  example_target?: string;
  example_native?: string;
}

export const parseVocabularyInput = (text: string): ParsedVocabularyWord[] => {
  const words: ParsedVocabularyWord[] = [];
  const parts = text.split(/[,\n]+/);

  for (const part of parts) {
    const match = part.match(/([^-=]+)[-=](.+)/);
    if (!match) continue;

    const target = match[1].trim();
    const native = match[2].trim();

    if (!target || !native || target.length < 2 || native.length < 2) {
      continue;
    }

    words.push({
      target,
      native,
      phonetic: `/${target.toLowerCase()}/`,
      difficulty: 'medium',
    });
  }

  return words;
};
