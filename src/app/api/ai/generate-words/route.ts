import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';
import {
  AI_RATE_LIMIT,
  MAX_AI_TOPIC_CHARS,
  MAX_AI_WORD_COUNT,
} from '@/lib/apiLimits';
import { normalizeNativeLanguage, normalizeTargetLanguage } from '@/lib/aiValidation';
import { checkRateLimit } from '@/lib/rateLimit';
import { enforceAiUsage } from '@/lib/aiAccess';

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

    const rate = checkRateLimit(`ai:generate-words:${session.user.id}`, AI_RATE_LIMIT);
    if (!rate.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: rate.retryAfter },
        { status: 429, headers: { 'Retry-After': rate.retryAfter.toString() } }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
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

    const estimatedUnits = topicValue.length + requestedCount * 20;
    const usage = await enforceAiUsage({
      userId: session.user.id,
      email: session.user.email,
      units: estimatedUnits,
    });
    if (!usage.ok) {
      return NextResponse.json(usage.body, { status: usage.status });
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.generateWords(
      topicValue,
      requestedCount,
      safeLevel,
      safeTargetLanguage,
      safeNativeLanguage
    );

    const response = await gemini.generate(prompt, {
      temperature: 0.8,
      maxOutputTokens: 2048,
    });

    const result = parseAIResponse<GenerateResult>(response);

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
    return NextResponse.json(
      { error: 'Failed to generate words' },
      { status: 500 }
    );
  }
}
