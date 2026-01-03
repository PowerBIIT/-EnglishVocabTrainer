import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';
import { mapGeminiError } from '@/lib/aiErrors';
import {
  AI_RATE_LIMIT,
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
    const prompt = AI_PROMPTS.generateWords(
      topicValue,
      requestedCount,
      safeLevel,
      safeTargetLanguage,
      safeNativeLanguage
    );
    const finalPrompt = await buildPromptWithOverlays('generate-words', prompt);

    const startTime = Date.now();
    const response = await gemini.generateWithMetadata(finalPrompt, {
      temperature: 0.8,
      maxOutputTokens: 2048,
      model,
    });
    const durationMs = Date.now() - startTime;
    const totalTokens = response.usage.promptTokenCount + response.usage.candidatesTokenCount;

    await recordAiUsage({ userId: session.user.id, units: totalTokens }).catch(console.error);

    // Log telemetry (async, non-blocking)
    const languagePair = `${safeNativeLanguage}-${safeTargetLanguage}`;
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

    const result = parseAIResponse<GenerateResult>(response.content);

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

    return NextResponse.json(result);
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
