import { AI_PROMPTS } from '@/lib/gemini';

type PromptCatalogItem = {
  id: string;
  label: string;
  description: string;
  build: () => string;
};

export type AdminPromptPreview = Omit<PromptCatalogItem, 'build'> & {
  prompt: string;
};

export type PromptDefinition = PromptCatalogItem;

const SAMPLE_CONTEXT = `Level: A2\nVocabulary: 120\nStreak: 3 days`;

const PROMPT_CATALOG = [
  {
    id: 'generate-words',
    label: 'Generate vocabulary',
    description: 'Creates a list of new vocabulary items for a topic and level.',
    build: () => AI_PROMPTS.generateWords('travel', 8, 'A2', 'en', 'pl'),
  },
  {
    id: 'parse-text',
    label: 'Parse typed vocabulary',
    description: 'Extracts word pairs from user-entered text.',
    build: () =>
      AI_PROMPTS.parseText('ticket - bilet, station - stacja', 'en', 'pl'),
  },
  {
    id: 'extract-image',
    label: 'Extract from image',
    description: 'Extracts vocabulary pairs from uploaded notes photos.',
    build: () => AI_PROMPTS.extractFromImage('en', 'pl'),
  },
  {
    id: 'tutor-chat',
    label: 'Tutor chat',
    description: 'Responds to learner questions with context.',
    build: () =>
      AI_PROMPTS.tutorChat(
        SAMPLE_CONTEXT,
        'Explain the word "ticket".',
        'en',
        'pl',
        'pl'
      ),
  },
  {
    id: 'explain-word',
    label: 'Explain a word',
    description: 'Provides IPA, meanings, examples, and tips for a word.',
    build: () => AI_PROMPTS.explainWord('ticket', 'en', 'pl', 'pl'),
  },
  {
    id: 'evaluate-pronunciation',
    label: 'Pronunciation evaluation',
    description: 'Scores pronunciation and provides corrective feedback.',
    build: () =>
      AI_PROMPTS.evaluatePronunciation({
        expected: 'chocolate',
        phonetic: '/ˈtʃɒkələt/',
        spoken: 'chocolate',
        nativeLanguage: 'pl',
        targetLanguage: 'en',
        feedbackLanguage: 'pl',
      }),
  },
  {
    id: 'pronunciation-summary',
    label: 'Pronunciation summary',
    description: 'Summarizes a pronunciation session with short tips.',
    build: () =>
      AI_PROMPTS.pronunciationSummary({
        averageScore: 7.4,
        passingScore: 7,
        focusMode: 'new_words',
        targetLanguage: 'en',
        nativeLanguage: 'pl',
        feedbackLanguage: 'pl',
        words: [
          { word: 'school', phonetic: '/skuːl/', score: 8 },
          { word: 'homework', phonetic: '/ˈhəʊmwɜːk/', score: 6 },
          { word: 'teacher', phonetic: '/ˈtiːtʃər/', score: 7 },
        ],
      }),
  },
] as const satisfies PromptCatalogItem[];

export type PromptId = (typeof PROMPT_CATALOG)[number]['id'];

export const getPromptCatalog = (): AdminPromptPreview[] =>
  PROMPT_CATALOG.map(({ build, ...rest }) => ({
    ...rest,
    prompt: build(),
  }));

export const getPromptDefinition = (id: PromptId): PromptDefinition | null => {
  const match = PROMPT_CATALOG.find((item) => item.id === id);
  return match ?? null;
};
