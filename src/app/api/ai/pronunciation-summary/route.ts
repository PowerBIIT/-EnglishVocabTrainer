import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';
import { mapGeminiError } from '@/lib/aiErrors';
import { AI_RATE_LIMIT, MAX_AI_TERM_CHARS, MAX_AI_WORD_COUNT } from '@/lib/apiLimits';
import {
  normalizeFeedbackLanguage,
  normalizeNativeLanguage,
  normalizeTargetLanguage,
} from '@/lib/aiValidation';
import { checkRateLimit } from '@/lib/rateLimit';
import { enforceAiUsage } from '@/lib/aiAccess';
import { resolveGeminiModel } from '@/lib/aiModelResolver';
import { buildPromptWithOverlays } from '@/lib/aiPromptOverlay';

type SummaryWordInput = {
  word: string;
  phonetic?: string;
  score?: number | null;
};

type SummaryResult = {
  summary: string;
  tips: string[];
};

const normalizeWords = (words: unknown) => {
  if (!Array.isArray(words)) return [];
  return words
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rawWord = (item as { word?: unknown }).word;
      if (typeof rawWord !== 'string') return null;
      const word = rawWord.trim();
      if (!word || word.length > MAX_AI_TERM_CHARS) return null;
      const rawPhonetic = (item as { phonetic?: unknown }).phonetic;
      const phonetic =
        typeof rawPhonetic === 'string'
          ? rawPhonetic.trim().slice(0, MAX_AI_TERM_CHARS)
          : undefined;
      const rawScore = (item as { score?: unknown }).score;
      const score =
        typeof rawScore === 'number' && Number.isFinite(rawScore)
          ? Math.max(1, Math.min(10, rawScore))
          : null;
      return { word, phonetic: phonetic || undefined, score };
    })
    .filter((item): item is SummaryWordInput => Boolean(item))
    .slice(0, MAX_AI_WORD_COUNT);
};

const buildUsageUnits = (words: SummaryWordInput[], extra: string) =>
  words.reduce(
    (total, item) => total + item.word.length + (item.phonetic?.length ?? 0),
    extra.length
  );

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = await checkRateLimit(`ai:pronunciation-summary:${session.user.id}`, AI_RATE_LIMIT);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rate.retryAfter, fallback: true },
      { status: 429, headers: { 'Retry-After': rate.retryAfter.toString() } }
    );
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'api_key_missing', fallback: true }, { status: 200 });
    }

    const body = await request.json();
    const averageScore =
      typeof body?.averageScore === 'number' && Number.isFinite(body.averageScore)
        ? body.averageScore
        : null;
    const passingScore =
      typeof body?.passingScore === 'number' && Number.isFinite(body.passingScore)
        ? body.passingScore
        : null;
    const focusMode = typeof body?.focusMode === 'string' ? body.focusMode.trim() : 'random';
    const words = normalizeWords(body?.words);

    if (averageScore === null || passingScore === null || words.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: averageScore, passingScore, and words are required' },
        { status: 400 }
      );
    }

    const safeTargetLanguage = normalizeTargetLanguage(body?.targetLanguage);
    const safeNativeLanguage = normalizeNativeLanguage(body?.nativeLanguage);
    const safeFeedbackLanguage = normalizeFeedbackLanguage(
      body?.feedbackLanguage,
      safeNativeLanguage
    );

    const baseContext = words.map((item) => item.word).join(', ');
    const usage = await enforceAiUsage({
      userId: session.user.id,
      email: session.user.email,
      units: buildUsageUnits(words, baseContext),
    });
    if (!usage.ok) {
      return NextResponse.json({ ...usage.body, fallback: true }, { status: usage.status });
    }

    const model = await resolveGeminiModel();
    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.pronunciationSummary({
      averageScore,
      passingScore,
      focusMode,
      targetLanguage: safeTargetLanguage,
      nativeLanguage: safeNativeLanguage,
      feedbackLanguage: safeFeedbackLanguage,
      words,
    });
    const finalPrompt = await buildPromptWithOverlays('pronunciation-summary', prompt);

    const response = await gemini.generate(finalPrompt, {
      temperature: 0.4,
      maxOutputTokens: 256,
      model,
    });

    const result = parseAIResponse<SummaryResult>(response, { logErrors: false });

    if (!result.summary || !Array.isArray(result.tips)) {
      throw new Error('Invalid response structure from Gemini');
    }

    return NextResponse.json({
      summary: result.summary.trim(),
      tips: result.tips.filter((tip) => typeof tip === 'string').slice(0, 2),
    });
  } catch (error) {
    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json({ ...mapped.body, fallback: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'ai_failed', fallback: true }, { status: 200 });
  }
}
