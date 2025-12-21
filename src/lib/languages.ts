import type { AppLanguage } from '@/lib/i18n';
import type {
  FeedbackLanguage,
  LearningPairId,
  NativeLanguage,
  TargetLanguage,
  VocabularyItem,
} from '@/types';

export type LanguageCode = FeedbackLanguage;

export interface LearningPair {
  id: LearningPairId;
  native: NativeLanguage;
  target: TargetLanguage;
  uiLanguage: AppLanguage;
  feedbackLanguage: FeedbackLanguage;
  label: { pl: string; en: string };
}

export const DEFAULT_PAIR_ID: LearningPairId = 'pl-en';

export const LEARNING_PAIRS: LearningPair[] = [
  {
    id: 'pl-en',
    native: 'pl',
    target: 'en',
    uiLanguage: 'pl',
    feedbackLanguage: 'pl',
    label: { pl: 'Polski → Angielski', en: 'Polish → English' },
  },
  {
    id: 'de-en',
    native: 'de',
    target: 'en',
    uiLanguage: 'en',
    feedbackLanguage: 'de',
    label: { pl: 'Niemiecki → Angielski', en: 'German → English' },
  },
  {
    id: 'uk-pl',
    native: 'uk',
    target: 'pl',
    uiLanguage: 'pl',
    feedbackLanguage: 'uk',
    label: { pl: 'Ukraiński → Polski', en: 'Ukrainian → Polish' },
  },
];

export const LEARNING_PAIR_SAMPLES: Record<
  LearningPairId,
  { target: string; native: string }
> = {
  'pl-en': { target: 'breakfast', native: 'śniadanie' },
  'de-en': { target: 'school', native: 'Schule' },
  'uk-pl': { target: 'śniadanie', native: 'сніданок' },
};

const LANGUAGE_LABELS: Record<AppLanguage, Record<LanguageCode, string>> = {
  pl: {
    pl: 'Polski',
    en: 'Angielski',
    de: 'Niemiecki',
    uk: 'Ukraiński',
  },
  en: {
    pl: 'Polish',
    en: 'English',
    de: 'German',
    uk: 'Ukrainian',
  },
};

const LANGUAGE_LOCALES: Record<LanguageCode, string> = {
  pl: 'pl-PL',
  en: 'en-GB',
  de: 'de-DE',
  uk: 'uk-UA',
};

export const isLearningPairId = (value?: string): value is LearningPairId =>
  Boolean(value && LEARNING_PAIRS.some((pair) => pair.id === value));

export const getLearningPair = (pairId?: string): LearningPair => {
  if (isLearningPairId(pairId)) {
    return LEARNING_PAIRS.find((pair) => pair.id === pairId) ?? LEARNING_PAIRS[0];
  }
  return LEARNING_PAIRS[0];
};

export const buildPairId = (
  native: NativeLanguage,
  target: TargetLanguage
): LearningPairId => `${native}-${target}` as LearningPairId;

export const normalizePairId = (pairId?: string): LearningPairId =>
  isLearningPairId(pairId) ? pairId : DEFAULT_PAIR_ID;

export const getLanguageLabel = (language: LanguageCode, uiLanguage: AppLanguage) =>
  LANGUAGE_LABELS[uiLanguage]?.[language] ?? language.toUpperCase();

export const getSpeechLocale = (
  targetLanguage: TargetLanguage,
  voice?: 'british' | 'american' | 'australian'
) => {
  if (targetLanguage !== 'en') {
    return LANGUAGE_LOCALES[targetLanguage];
  }
  if (voice === 'american') return 'en-US';
  if (voice === 'australian') return 'en-AU';
  return 'en-GB';
};

export const getTargetText = (word: VocabularyItem) => word.en;
export const getNativeText = (word: VocabularyItem) => word.pl;
export const getTargetExample = (word: VocabularyItem) => word.example_en;
export const getNativeExample = (word: VocabularyItem) => word.example_pl;
