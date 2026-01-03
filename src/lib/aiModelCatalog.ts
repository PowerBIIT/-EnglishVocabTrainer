export type AiModelStatus = 'stable' | 'preview' | 'experimental';

export type AiModelInfo = {
  id: string;
  label: string;
  status: AiModelStatus;
  description: string;
  bestFor: string;
};

export const GEMINI_MODEL_CONFIG_KEY = 'GEMINI_MODEL';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const GEMINI_MODELS: AiModelInfo[] = [
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash (preview)',
    status: 'preview',
    description: 'Most intelligent flash model tuned for fast, high-quality answers.',
    bestFor: 'Tutor chats, explanations, and nuanced feedback.',
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    status: 'stable',
    description: 'Best price-performance balance for large scale, low-latency tasks.',
    bestFor: 'Bulk vocabulary generation and parsing.',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    status: 'stable',
    description: 'Cost-efficient model optimized for high throughput.',
    bestFor: 'High-volume extraction or simpler requests.',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    status: 'stable',
    description: 'Higher reasoning quality with richer responses.',
    bestFor: 'Complex explanations or deeper feedback.',
  },
];

export const getGeminiModelInfo = (id?: string | null) =>
  GEMINI_MODELS.find((model) => model.id === id);

export const isGeminiModelId = (id?: string | null) => Boolean(getGeminiModelInfo(id));
