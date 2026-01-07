import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';
import { mapGeminiError } from '@/lib/aiErrors';
import {
  AI_RATE_LIMIT,
  MAX_AI_GENERATE_WORD_COUNT,
  MAX_AI_TOPIC_CHARS,
  MAX_AI_WORD_COUNT,
} from '@/lib/apiLimits';
import { normalizeNativeLanguage, normalizeTargetLanguage } from '@/lib/aiValidation';
import { checkRateLimit } from '@/lib/rateLimit';
import { ensureAiAccess } from '@/lib/aiAccess';
import { resolveGeminiModel } from '@/lib/aiModelResolver';
import { buildPromptWithOverlays } from '@/lib/aiPromptOverlay';
import { logAiRequest } from '@/lib/aiTelemetry';
import { recordAiUsage } from '@/lib/aiUsage';

interface GeneratedWord {
  target: string;
  phonetic: string;
  native: string;
  example_target?: string;
  example_native?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GenerateResult {
  topic: string;
  level: string;
  words: GeneratedWord[];
  error?: 'UNSAFE_TOPIC' | 'NEEDS_CLARIFICATION';
}

const normalizeForMatch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0141\u0142]/g, 'l')
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, '');

const QUESTION_PREFIXES = [
  'jak',
  'co',
  'czy',
  'dlaczego',
  'kiedy',
  'gdzie',
  'ile',
  'jaki',
  'jaka',
  'jakie',
  'po co',
  'do czego',
  'w jaki sposob',
  'how',
  'what',
  'why',
  'when',
  'where',
  'who',
  'which',
  'can',
  'should',
  'could',
  'would',
  'is',
  'are',
  'was',
  'were',
].map(normalizeForMatch);

const looksLikeQuestion = (text: string) => {
  if (text.includes('?')) return true;
  const normalized = normalizeForMatch(text);
  return QUESTION_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

const estimateWordOutputTokens = (count: number) => {
  const baseTokens = 220;
  const perWordTokens = 60;
  const estimate = baseTokens + count * perWordTokens;
  return Math.max(512, Math.min(2048, estimate));
};

const buildRetryTokenBudget = (initialBudget: number) =>
  Math.min(3072, Math.max(768, Math.round(initialBudget * 1.5)));

const WORDS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    level: { type: 'string' },
    words: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          phonetic: { type: 'string' },
          native: { type: 'string' },
          example_target: { type: 'string' },
          example_native: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        },
        required: [
          'target',
          'phonetic',
          'native',
          'example_target',
          'example_native',
          'difficulty',
        ],
      },
    },
    error: { type: 'string', enum: ['UNSAFE_TOPIC', 'NEEDS_CLARIFICATION'] },
  },
  required: ['topic', 'level', 'words'],
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await checkRateLimit(`ai:generate-words:${session.user.id}`, AI_RATE_LIMIT);
    if (!rate.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: rate.retryAfter },
        { status: 429, headers: { 'Retry-After': rate.retryAfter.toString() } }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'api_key_missing' },
        { status: 503 }
      );
    }

    const { topic, count = 10, level = 'A2', targetLanguage, nativeLanguage } =
      await request.json();
    const topicValue = typeof topic === 'string' ? topic.trim() : '';
    const rawCount = typeof count === 'number' ? count : Number(count);
    const requestedCount = Number.isFinite(rawCount) ? Math.round(rawCount) : 10;
    const levelValue = typeof level === 'string' ? level.toUpperCase() : 'A2';
    const allowedLevels = new Set(['A1', 'A2', 'B1', 'B2']);
    const safeLevel = allowedLevels.has(levelValue) ? levelValue : 'A2';

    if (!topicValue) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    if (looksLikeQuestion(topicValue)) {
      return NextResponse.json(
        { error: 'topic_question' },
        { status: 400 }
      );
    }

    if (topicValue.length > MAX_AI_TOPIC_CHARS) {
      return NextResponse.json(
        { error: 'Topic too long', maxChars: MAX_AI_TOPIC_CHARS },
        { status: 413 }
      );
    }

    if (requestedCount < 1) {
      return NextResponse.json(
        { error: 'Count must be greater than 0' },
        { status: 400 }
      );
    }

    if (requestedCount > MAX_AI_WORD_COUNT) {
      return NextResponse.json(
        { error: 'Count too large', maxCount: MAX_AI_WORD_COUNT },
        { status: 413 }
      );
    }

    const effectiveCount = Math.min(requestedCount, MAX_AI_GENERATE_WORD_COUNT);
    const safeTargetLanguage = normalizeTargetLanguage(targetLanguage);
    const safeNativeLanguage = normalizeNativeLanguage(nativeLanguage);

    const access = await ensureAiAccess({
      userId: session.user.id,
      email: session.user.email,
    });
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status });
    }

    const model = await resolveGeminiModel();
    const gemini = new GeminiService(apiKey);
    const buildPrompt = async (count: number, options?: { compact?: boolean }) => {
      const prompt = AI_PROMPTS.generateWords(
        topicValue,
        count,
        safeLevel,
        safeTargetLanguage,
        safeNativeLanguage,
        options
      );
      return buildPromptWithOverlays('generate-words', prompt);
    };

    const languagePair = `${safeNativeLanguage}-${safeTargetLanguage}`;
    const requestGeneration = async (
      prompt: string,
      maxOutputTokens: number,
      temperature: number
    ) => {
      const startTime = Date.now();
      const response = await gemini.generateWithMetadata(prompt, {
        temperature,
        maxOutputTokens,
        model,
        responseMimeType: 'application/json',
        responseSchema: WORDS_RESPONSE_SCHEMA,
      });
      const durationMs = Date.now() - startTime;
      const totalTokens = response.usage.promptTokenCount + response.usage.candidatesTokenCount;

      await recordAiUsage({ userId: session.user.id, units: totalTokens }).catch(console.error);

      logAiRequest({
        userId: session.user.id,
        feature: 'generate-words',
        model: response.model,
        languagePair,
        inputTokens: response.usage.promptTokenCount,
        outputTokens: response.usage.candidatesTokenCount,
        durationMs,
        success: true,
      }).catch(console.error);

      return response;
    };

    const parseResult = (content: string) => {
      try {
        return parseAIResponse<GenerateResult>(content, { logErrors: false });
      } catch {
        return null;
      }
    };

    const initialBudget = estimateWordOutputTokens(effectiveCount);
    const basePrompt = await buildPrompt(effectiveCount);
    let response = await requestGeneration(basePrompt, initialBudget, 0.8);
    let result: GenerateResult | null = null;
    result = parseResult(response.content);

    if (!result) {
      const retryBudget = buildRetryTokenBudget(initialBudget);
      response = await requestGeneration(basePrompt, retryBudget, 0.6);
      result = parseResult(response.content);
    }

    let finalCount = effectiveCount;
    if (!result) {
      const compactCount = Math.min(effectiveCount, 8);
      const compactPrompt = await buildPrompt(compactCount, { compact: true });
      const compactBudget = estimateWordOutputTokens(compactCount);
      response = await requestGeneration(compactPrompt, compactBudget, 0.4);
      result = parseResult(response.content);
      finalCount = compactCount;
    }

    if (!result) {
      return NextResponse.json(
        { error: 'response_truncated' },
        { status: 422 }
      );
    }

    if (result.error === 'UNSAFE_TOPIC') {
      return NextResponse.json(
        { error: 'unsafe_topic' },
        { status: 400 }
      );
    }

    if (result.error === 'NEEDS_CLARIFICATION') {
      return NextResponse.json(
        { error: 'needs_clarification' },
        { status: 400 }
      );
    }

    if (!Array.isArray(result.words)) {
      return NextResponse.json(
        { error: 'response_truncated' },
        { status: 422 }
      );
    }

    const normalizedWords = result.words.slice(0, finalCount);
    const responseBody: GenerateResult & {
      warning?: 'partial_result';
      requestedCount: number;
      returnedCount: number;
    } = {
      ...result,
      words: normalizedWords,
      requestedCount,
      returnedCount: normalizedWords.length,
    };

    if (normalizedWords.length < requestedCount) {
      responseBody.warning = 'partial_result';
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Word generation error:', error);
    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'Failed to generate words' },
      { status: 500 }
    );
  }
}
