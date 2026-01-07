import type { FeedbackLanguage, NativeLanguage, TargetLanguage } from '@/types';
import {
  GeminiApiError,
  classifyGeminiError,
  createGeminiTimeoutError,
} from '@/lib/aiErrors';
import { DEFAULT_GEMINI_MODEL } from '@/lib/aiModelCatalog';

// Gemini API Service Layer

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = DEFAULT_GEMINI_MODEL;
const GEMINI_TIMEOUT_MS = 20000;

interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
  usageMetadata?: GeminiUsageMetadata;
  error?: {
    message: string;
    code: number;
    status?: string;
  };
}

export interface GeminiGenerateResult {
  content: string;
  usage: GeminiUsageMetadata;
  model: string;
}

interface GenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
}

export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async requestWithMetadata(
    body: Record<string, unknown>,
    options: GenerateOptions = {}
  ): Promise<{ content: string; usage: GeminiUsageMetadata; model: string }> {
    const {
      temperature = 0.7,
      maxOutputTokens = 1024,
      model = DEFAULT_MODEL,
      responseMimeType,
      responseSchema,
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            ...body,
            generationConfig: {
              temperature,
              maxOutputTokens,
              ...(responseMimeType ? { responseMimeType } : {}),
              ...(responseSchema ? { responseSchema } : {}),
            },
          }),
          signal: controller.signal,
        }
      );

      const responseText = await response.text();
      let data: GeminiResponse | null = null;
      try {
        data = JSON.parse(responseText) as GeminiResponse;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const statusText = data?.error?.status;
        const message = data?.error?.message ?? `Gemini API error (${response.status})`;
        throw new GeminiApiError({
          message,
          status: response.status,
          statusText,
          type: classifyGeminiError(response.status, statusText),
        });
      }

      if (data?.error) {
        const statusText = data.error.status;
        const status = Number.isFinite(data.error.code) ? data.error.code : response.status;
        throw new GeminiApiError({
          message: data.error.message,
          status,
          statusText,
          type: classifyGeminiError(status, statusText),
        });
      }

      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new GeminiApiError({
          message: 'No response from Gemini',
          status: response.status,
          statusText: data?.error?.status,
          type: 'unknown',
        });
      }

      const usage: GeminiUsageMetadata = data?.usageMetadata ?? {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
      };

      return { content, usage, model };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw createGeminiTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generate(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<string> {
    const result = await this.requestWithMetadata(
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      options
    );
    return result.content;
  }

  async generateWithMetadata(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<GeminiGenerateResult> {
    return this.requestWithMetadata(
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      options
    );
  }

  async generateWithImage(
    prompt: string,
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    options: GenerateOptions = {}
  ): Promise<string> {
    const result = await this.requestWithMetadata(
      {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      },
      options
    );
    return result.content;
  }

  async generateWithImageAndMetadata(
    prompt: string,
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    options: GenerateOptions = {}
  ): Promise<GeminiGenerateResult> {
    return this.requestWithMetadata(
      {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      },
      options
    );
  }
}

// AI Prompts for different functions
const LANGUAGE_NAMES: Record<FeedbackLanguage, string> = {
  pl: 'Polish',
  en: 'English',
  de: 'German',
  uk: 'Ukrainian',
};

const getLanguageName = (code: FeedbackLanguage | NativeLanguage | TargetLanguage) =>
  LANGUAGE_NAMES[code as FeedbackLanguage] ?? code.toUpperCase();

const SAFETY_RULES = `
Safety rules (applies to all outputs):
- This app is for learners aged 11-13. Keep content school-appropriate and neutral.
- Do NOT include content about sex/sexual content, nudity, violence, weapons, crime, drugs, alcohol, gambling, self-harm, suicide, hate speech, or extremist ideology.
- If the request is unsafe or asks for non-language-learning content, refuse briefly and suggest a safe topic.
`.trim();

export const AI_PROMPTS = {
  evaluatePronunciation: ({
    expected,
    phonetic,
    spoken,
    nativeLanguage,
    targetLanguage,
    feedbackLanguage,
  }: {
    expected: string;
    phonetic: string;
    spoken: string;
    nativeLanguage: NativeLanguage;
    targetLanguage: TargetLanguage;
    feedbackLanguage: FeedbackLanguage;
  }) => `
You are a pronunciation coach. The learner's native language is ${getLanguageName(nativeLanguage)}.
They are practicing ${getLanguageName(targetLanguage)} pronunciation.

${SAFETY_RULES}

If the target word or recognized speech is unsafe or inappropriate:
- Do not repeat it.
- Return a minimal JSON response with score 1 and a brief refusal in ${getLanguageName(feedbackLanguage)}.
- Keep errorPhonemes empty and nativeInterference empty.

Target word: "${expected}"
IPA (if available): "${phonetic}"
Recognized speech: "${spoken}"

TASK: Provide a concise, practical pronunciation assessment.

Scoring (1-10):
- 9-10: Near-native
- 7-8: Good, minor issues
- 5-6: Understandable but with clear mistakes
- 3-4: Hard to understand
- 1-2: Not understandable

Respond ONLY in JSON (no markdown):
{
  "score": <1-10>,
  "feedback": "<short feedback in ${getLanguageName(feedbackLanguage)}, max 2 sentences, encouraging tone>",
  "tip": "<one concrete tip on how to improve, max 1 sentence>",
  "errorPhonemes": ["up to 3 problematic phonemes or sounds, only if score < 8"],
  "nativeInterference": "<optional: note about native language influence if detected>"
}`,

  pronunciationSummary: ({
    averageScore,
    passingScore,
    focusMode,
    targetLanguage,
    nativeLanguage,
    feedbackLanguage,
    words,
  }: {
    averageScore: number;
    passingScore: number;
    focusMode: string;
    targetLanguage: TargetLanguage;
    nativeLanguage: NativeLanguage;
    feedbackLanguage: FeedbackLanguage;
    words: Array<{ word: string; phonetic?: string; score?: number | null }>;
  }) => {
    const wordLines = words
      .map((item) => {
        const scoreLabel =
          typeof item.score === 'number' ? item.score.toFixed(1) : 'n/a';
        const phonetic = item.phonetic ? ` IPA: ${item.phonetic}` : '';
        return `- ${item.word} (${scoreLabel}/10)${phonetic}`;
      })
      .join('\n');

    return `
${SAFETY_RULES}

You are a pronunciation coach. The learner's native language is ${getLanguageName(nativeLanguage)}.
They are practicing ${getLanguageName(targetLanguage)} pronunciation.

Session focus: ${focusMode}
Average score: ${averageScore.toFixed(1)}/10 (passing: ${passingScore}/10)

Words and scores:
${wordLines}

TASK: Provide a very short summary in ${getLanguageName(feedbackLanguage)} and 2 short tips.

Constraints:
- Summary: exactly 1 sentence, supportive tone, no emojis.
- Tips: exactly 2 items, each max 5 words.

Respond ONLY in JSON (no markdown):
{
  "summary": "<short summary>",
  "tips": ["<tip 1>", "<tip 2>"]
}`;
  },

  generateWords: (
    topic: string,
    count: number,
    level: string,
    targetLanguage: TargetLanguage,
    nativeLanguage: NativeLanguage
  ) => `
${SAFETY_RULES}

Generate EXACTLY ${count} ${getLanguageName(targetLanguage)} vocabulary items about the topic below.
Topic description (may be in any language): "${topic}"
Level: ${level} (A1/A2/B1/B2)
Provide translations in ${getLanguageName(nativeLanguage)}.

For each item return:
- target: word/phrase in ${getLanguageName(targetLanguage)}
- phonetic: IPA for the target word (if unsure, return an empty string)
- native: translation in ${getLanguageName(nativeLanguage)}
- example_target: short example sentence in ${getLanguageName(targetLanguage)}
- example_native: translation of the example sentence
- difficulty: easy/medium/hard

Constraints:
- Use only safe, everyday vocabulary appropriate for ages 11-13.
- Interpret the topic even if it is written in a different language; still generate in ${getLanguageName(targetLanguage)}.
- If the topic is a school subject or profession (e.g., accounting), include common people, documents, actions, and places from that domain.
- Keep the vocabulary practical and classroom-appropriate; avoid rare jargon.
- No duplicates.
- Prefer 1-3 word phrases, avoid long sentences in "target".
- Keep example sentences short (max 6 words).
- Ensure "target" is in ${getLanguageName(targetLanguage)} and "native" is in ${getLanguageName(nativeLanguage)}.
- If the topic is phrased as a question or a request for instructions (e.g., "how to bake a cake"), respond with NEEDS_CLARIFICATION.

If the topic is unsafe, respond with:
{
  "topic": "${topic}",
  "level": "${level}",
  "words": [],
  "error": "UNSAFE_TOPIC"
}

If the topic is too vague/unclear, respond with:
{
  "topic": "${topic}",
  "level": "${level}",
  "words": [],
  "error": "NEEDS_CLARIFICATION"
}

Respond ONLY in JSON (no markdown):
{
  "topic": "${topic}",
  "level": "${level}",
  "words": [
    {
      "target": "...",
      "phonetic": "/.../",
      "native": "...",
      "example_target": "...",
      "example_native": "...",
      "difficulty": "easy|medium|hard"
    }
  ]
}`,

  parseText: (
    userInput: string,
    targetLanguage: TargetLanguage,
    nativeLanguage: NativeLanguage
  ) => `
${SAFETY_RULES}

The user entered vocabulary in mixed formats. Parse and structure it.
Do NOT invent words. Only extract pairs clearly present in the input.

User input:
"${userInput}"

Identify ${getLanguageName(targetLanguage)} words/phrases and their ${getLanguageName(nativeLanguage)} translations.
Generate IPA for the ${getLanguageName(targetLanguage)} words (if unsure, use an empty string).

Rules:
- Return at most 30 word pairs; prioritize the clearest ones.
- If an item is unsafe or inappropriate, skip it and add it to "parse_errors". Do not repeat unsafe content.

Respond ONLY in JSON (no markdown):
{
  "words": [
    {"target": "...", "phonetic": "/.../", "native": "...", "difficulty": "easy|medium|hard"}
  ],
  "category_suggestion": "suggested category",
  "parse_errors": ["list of items that could not be parsed"]
}`,

  extractFromImage: (targetLanguage: TargetLanguage, nativeLanguage: NativeLanguage) => `
${SAFETY_RULES}

You are a vocabulary extraction assistant. Analyze the photo of notes and extract vocabulary pairs.
The notes may be handwritten and contain extra phonetic hints.
Do NOT invent words. Only extract what is clearly visible. If something is unclear, skip it and mention it in "notes".

Look for lines like:
"take photos /tejk fotos/ - robić zdjęcia"
"do homework - odrobić lekcje"

Rules:
- Left side is ${getLanguageName(targetLanguage)}, right side is ${getLanguageName(nativeLanguage)}.
- Ignore phonetic hints in / / or [ ].
- Accept separators "-", "–", "—", ":", "->" (there may be extra spaces or dots).
- If a line has no clear translation, skip it.
- Return at most 30 word pairs; prioritize the clearest ones.
- If something is unsafe or inappropriate, skip it and mention it in "notes". Do not repeat unsafe content.

Generate IPA for the ${getLanguageName(targetLanguage)} words (if unsure, use an empty string).

Respond ONLY in JSON (no markdown):
{
  "category_suggestion": "suggested category name based on the words",
  "words": [
    {"target": "...", "phonetic": "/.../", "native": "...", "difficulty": "easy|medium|hard"}
  ],
  "notes": "optional notes if something was unclear"
}`,

  tutorChat: (
    context: string,
    userMessage: string,
    targetLanguage: TargetLanguage,
    nativeLanguage: NativeLanguage,
    feedbackLanguage: FeedbackLanguage
  ) => `
You are a friendly AI tutor helping someone learn ${getLanguageName(targetLanguage)}.
The learner's native language is ${getLanguageName(nativeLanguage)}.
Respond in ${getLanguageName(feedbackLanguage)} and avoid emojis.
Use examples in ${getLanguageName(targetLanguage)} when helpful.
If explaining a word, include IPA and a short example.
${SAFETY_RULES}
If the user asks for unsafe or non-educational content, refuse briefly and suggest a safe language-learning topic.

Learner context:
${context}

User message: "${userMessage}"

Keep replies concise but flexible:
- Simple questions: 1-2 short sentences.
- Explanations or grammar: up to 6 short sentences or a short bullet list.
- Use at most 2 short examples.
- Aim for 60-160 words max, depending on complexity.

Reply naturally like a helpful teacher.`,

  adminAssistant: (
    context: string,
    userMessage: string,
    feedbackLanguage: FeedbackLanguage
  ) => `
You are an AI assistant for the app admin.
Your role is to help with AI configuration, prompt overlays, model selection, and debugging issues.
Keep responses concise and actionable. Use bullet points when helpful. Avoid emojis.
If asked to edit prompts, suggest overlay instructions rather than rewriting full prompts.
If the user requests unsafe content, refuse briefly and suggest safe alternatives.
${SAFETY_RULES}

Admin context:
${context}

Admin request: "${userMessage}"

Respond in ${getLanguageName(feedbackLanguage)}.`,

  adminCopilot: (
    context: string,
    userMessage: string,
    feedbackLanguage: FeedbackLanguage
  ) => `
You are an AI copilot for the app admin.
Your role is to analyze product usage, AI costs, and configuration.
Keep replies concise and actionable. Use bullet points when helpful. Avoid emojis.
If the user asks for unsafe content, refuse briefly and suggest safe alternatives.
${SAFETY_RULES}

Context JSON:
${context}

Admin request: "${userMessage}"

Respond ONLY in JSON (no markdown):
{
  "reply": "...",
  "actions": [
    {
      "type": "set_config" | "set_model" | "set_overlay",
      "key": "CONFIG_KEY",
      "value": "string",
      "model": "model-id",
      "scope": "global|prompt",
      "promptId": "prompt-id",
      "overlay": "short overlay text",
      "reason": "optional short reason"
    }
  ]
}

Rules:
- Always include "reply".
- Use actions only if you are confident they are safe and relevant.
- Use only config keys, models, and prompt IDs provided in the context.
- For set_overlay, keep overlay under 600 characters and do not include JSON or markdown.
- If no actions are needed, return an empty array.
Respond in ${getLanguageName(feedbackLanguage)}.`,

  explainWord: (
    word: string,
    targetLanguage: TargetLanguage,
    nativeLanguage: NativeLanguage,
    feedbackLanguage: FeedbackLanguage
  ) => `
Explain the following ${getLanguageName(targetLanguage)} word or phrase: "${word}"
${SAFETY_RULES}
If the word is unsafe/inappropriate, do not explain it. Provide a brief refusal and suggest a safe alternative word. Do not repeat the unsafe word.

Keep the response concise:
- Max 2 meanings
- Max 2 example sentences
- Max 3 synonyms
- 1 short common mistake
- 1 short memory tip
- Total under 120 words

Provide:
1. IPA pronunciation
2. Up to 2 meanings with translations into ${getLanguageName(nativeLanguage)}
3. Up to 2 example sentences in ${getLanguageName(targetLanguage)} with translations
4. Synonyms (if applicable)
5. Common mistakes (if applicable)
6. A short memory tip

Respond in ${getLanguageName(feedbackLanguage)}. Do not use emojis.`,

  revenueStrategy: (
    stats: {
      mrr: number;
      arr: number;
      activeSubscribers: number;
      trialConversion: number;
      churnRate: number;
      aiCostPerUser: number;
      tokens: { input: number; output: number; cost: number };
      topFeatures: Array<{ name: string; usage: number; cost: number }>;
    },
    userMessage: string,
    feedbackLanguage: FeedbackLanguage
  ) => `
You are a SaaS revenue strategist for an AI-powered vocabulary learning app called "Henio".
Your role is to analyze metrics and provide actionable revenue optimization recommendations.
Keep responses concise and practical. Use bullet points when helpful. Avoid emojis.
Consider the education context (students aged 11-16 in Poland and Ukraine).

${SAFETY_RULES}

Current business metrics:
- MRR (Monthly Recurring Revenue): $${(stats.mrr / 100).toFixed(2)}
- ARR (Annual Recurring Revenue): $${(stats.arr / 100).toFixed(2)}
- Active subscribers: ${stats.activeSubscribers}
- Trial conversion rate: ${stats.trialConversion.toFixed(1)}%
- Monthly churn rate: ${stats.churnRate.toFixed(1)}%
- AI cost per active user: $${stats.aiCostPerUser.toFixed(4)}/month

AI token usage this month:
- Input tokens: ${stats.tokens.input.toLocaleString()}
- Output tokens: ${stats.tokens.output.toLocaleString()}
- Total AI cost: $${stats.tokens.cost.toFixed(2)}

Top features by AI cost:
${stats.topFeatures.map((f) => `- ${f.name}: ${f.usage.toLocaleString()} requests, $${f.cost.toFixed(2)} cost`).join('\n')}

Admin question: "${userMessage}"

Provide specific, actionable recommendations. Consider:
1. Pricing optimization (plan tiers, feature gating)
2. Cost reduction (caching, model selection, usage limits)
3. Growth opportunities (upselling, retention, expansion)
4. Unit economics (LTV vs CAC, margin improvement)

Respond in ${getLanguageName(feedbackLanguage)}.`,
};

// Helper to safely parse JSON from AI response
export function parseAIResponse<T>(
  response: string,
  options?: { logErrors?: boolean }
): T {
  let cleaned = response.trim();

  // Remove markdown code blocks (```json or ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');

  // Handle cases where Gemini adds explanation text before/after JSON
  // Find the first { and last } to extract just the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  cleaned = cleaned.trim();

  if (!cleaned) {
    throw new Error('Empty response after cleanup');
  }

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    const shouldLog = options?.logErrors !== false;
    if (shouldLog && process.env.NODE_ENV !== 'production') {
      // Log the problematic response for debugging
      console.error('Failed to parse Gemini response as JSON:');
      console.error('Original:', response);
      console.error('Cleaned:', cleaned);
    } else if (shouldLog) {
      console.error('Failed to parse Gemini response as JSON.');
    }
    throw new Error(
      `Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'unknown error'}`
    );
  }
}
