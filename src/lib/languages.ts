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
  label: Record<AppLanguage, string>;
}

export const DEFAULT_PAIR_ID: LearningPairId = 'pl-en';

export const LEARNING_PAIRS: LearningPair[] = [
  {
    id: 'uk-pl',
    native: 'uk',
    target: 'pl',
    uiLanguage: 'uk',
    feedbackLanguage: 'uk',
    label: {
      pl: 'Ukraiński → Polski',
      en: 'Ukrainian → Polish',
      uk: 'Українська → Польська',
    },
  },
  {
    id: 'uk-en',
    native: 'uk',
    target: 'en',
    uiLanguage: 'uk',
    feedbackLanguage: 'uk',
    label: {
      pl: 'Ukraiński → Angielski',
      en: 'Ukrainian → English',
      uk: 'Українська → Англійська',
    },
  },
  {
    id: 'uk-de',
    native: 'uk',
    target: 'de',
    uiLanguage: 'uk',
    feedbackLanguage: 'uk',
    label: {
      pl: 'Ukraiński → Niemiecki',
      en: 'Ukrainian → German',
      uk: 'Українська → Німецька',
    },
  },
  {
    id: 'pl-en',
    native: 'pl',
    target: 'en',
    uiLanguage: 'pl',
    feedbackLanguage: 'pl',
    label: {
      pl: 'Polski → Angielski',
      en: 'Polish → English',
      uk: 'Польська → Англійська',
    },
  },
  {
    id: 'de-en',
    native: 'de',
    target: 'en',
    uiLanguage: 'en',
    feedbackLanguage: 'de',
    label: {
      pl: 'Niemiecki → Angielski',
      en: 'German → English',
      uk: 'Німецька → Англійська',
    },
  },
];

export const LEARNING_PAIR_SAMPLES: Record<
  LearningPairId,
  { target: string; native: string }
> = {
  'uk-pl': { target: 'śniadanie', native: 'сніданок' },
  'uk-en': { target: 'breakfast', native: 'сніданок' },
  'uk-de': { target: 'Frühstück', native: 'сніданок' },
  'pl-en': { target: 'breakfast', native: 'śniadanie' },
  'de-en': { target: 'school', native: 'Schule' },
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
  uk: {
    pl: 'Польська',
    en: 'Англійська',
    de: 'Німецька',
    uk: 'Українська',
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

const defaultPair =
  LEARNING_PAIRS.find((pair) => pair.id === DEFAULT_PAIR_ID) ?? LEARNING_PAIRS[0];

export const getLearningPair = (pairId?: string): LearningPair => {
  if (isLearningPairId(pairId)) {
    return LEARNING_PAIRS.find((pair) => pair.id === pairId) ?? defaultPair;
  }
  return defaultPair;
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
