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

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
  error?: {
    message: string;
    code: number;
    status?: string;
  };
}

interface GenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}

export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(
    body: Record<string, unknown>,
    options: GenerateOptions = {}
  ): Promise<string> {
    const {
      temperature = 0.7,
      maxOutputTokens = 1024,
      model = DEFAULT_MODEL,
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...body,
            generationConfig: {
              temperature,
              maxOutputTokens,
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

      return content;
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
    return this.request(
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
    return this.request(
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
  "correct": <true if score >= 7>,
  "feedback": "<short feedback in ${getLanguageName(feedbackLanguage)}, max 2 sentences, encouraging tone>",
  "tip": "<one concrete tip on how to improve>",
  "errorPhonemes": ["list of problematic phonemes or sounds, if any"],
  "phonemeAnalysis": [
    {"phoneme": "<IPA phoneme>", "correct": <true/false>, "issue": "<issue description if incorrect>"}
  ],
  "nativeInterference": "<optional: note about native language influence if detected>"
}`,

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
- Ensure "target" is in ${getLanguageName(targetLanguage)} and "native" is in ${getLanguageName(nativeLanguage)}.

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
The user entered vocabulary in mixed formats. Parse and structure it.
Do NOT invent words. Only extract pairs clearly present in the input.

User input:
"${userInput}"

Identify ${getLanguageName(targetLanguage)} words/phrases and their ${getLanguageName(nativeLanguage)} translations.
Generate IPA for the ${getLanguageName(targetLanguage)} words (if unsure, use an empty string).

Respond ONLY in JSON (no markdown):
{
  "words": [
    {"target": "...", "phonetic": "/.../", "native": "...", "difficulty": "easy|medium|hard"}
  ],
  "category_suggestion": "suggested category",
  "parse_errors": ["list of items that could not be parsed"]
}`,

  extractFromImage: (targetLanguage: TargetLanguage, nativeLanguage: NativeLanguage) => `
You are a vocabulary extraction assistant. Analyze the image of notes and extract vocabulary pairs.
Do NOT invent words. Only extract what is clearly visible.

Return ${getLanguageName(targetLanguage)} words/phrases and their ${getLanguageName(nativeLanguage)} translations.
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

  explainWord: (
    word: string,
    targetLanguage: TargetLanguage,
    nativeLanguage: NativeLanguage,
    feedbackLanguage: FeedbackLanguage
  ) => `
Explain the following ${getLanguageName(targetLanguage)} word or phrase: "${word}"
${SAFETY_RULES}
If the word is unsafe/inappropriate, do not explain it. Provide a brief refusal and suggest a safe alternative word.

Provide:
1. IPA pronunciation
2. Meanings with translations into ${getLanguageName(nativeLanguage)}
3. 3 example sentences in ${getLanguageName(targetLanguage)} with translations
4. Synonyms (if applicable)
5. Common mistakes (if applicable)
6. A short memory tip

Respond in ${getLanguageName(feedbackLanguage)}. Do not use emojis.`,
};

// Helper to safely parse JSON from AI response
export function parseAIResponse<T>(response: string): T {
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
    if (process.env.NODE_ENV !== 'production') {
      // Log the problematic response for debugging
      console.error('Failed to parse Gemini response as JSON:');
      console.error('Original:', response);
      console.error('Cleaned:', cleaned);
    } else {
      console.error('Failed to parse Gemini response as JSON.');
    }
    throw new Error(
      `Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'unknown error'}`
    );
  }
}
