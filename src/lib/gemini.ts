import type { FeedbackLanguage, NativeLanguage, TargetLanguage } from '@/types';

// Gemini API Service Layer

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
  error?: {
    message: string;
    code: number;
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

  async generate(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<string> {
    const {
      temperature = 0.7,
      maxOutputTokens = 1024,
      model = DEFAULT_MODEL,
    } = options;

    const response = await fetch(
      `${GEMINI_API_URL}/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        }),
      }
    );

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('No response from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
  }

  async generateWithImage(
    prompt: string,
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    options: GenerateOptions = {}
  ): Promise<string> {
    const {
      temperature = 0.7,
      maxOutputTokens = 1024,
      model = DEFAULT_MODEL,
    } = options;

    const response = await fetch(
      `${GEMINI_API_URL}/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        }),
      }
    );

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('No response from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
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
Generate ${count} ${getLanguageName(targetLanguage)} vocabulary items about: ${topic}
Level: ${level} (A1/A2/B1/B2)
Provide translations in ${getLanguageName(nativeLanguage)}.

For each item return:
- target: word/phrase in ${getLanguageName(targetLanguage)}
- phonetic: IPA for the target word (if unsure, return an empty string)
- native: translation in ${getLanguageName(nativeLanguage)}
- example_target: short example sentence in ${getLanguageName(targetLanguage)}
- example_native: translation of the example sentence
- difficulty: easy/medium/hard

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

Learner context:
${context}

User message: "${userMessage}"

Reply naturally like a helpful teacher.`,

  explainWord: (
    word: string,
    targetLanguage: TargetLanguage,
    nativeLanguage: NativeLanguage,
    feedbackLanguage: FeedbackLanguage
  ) => `
Explain the following ${getLanguageName(targetLanguage)} word or phrase: "${word}"

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
    // Log the problematic response for debugging
    console.error('Failed to parse Gemini response as JSON:');
    console.error('Original:', response);
    console.error('Cleaned:', cleaned);
    throw new Error(
      `Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'unknown error'}`
    );
  }
}
