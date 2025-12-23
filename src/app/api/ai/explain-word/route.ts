import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS } from '@/lib/gemini';
import { mapGeminiError } from '@/lib/aiErrors';
import { AI_RATE_LIMIT, MAX_AI_TERM_CHARS } from '@/lib/apiLimits';
import {
  normalizeFeedbackLanguage,
  normalizeNativeLanguage,
  normalizeTargetLanguage,
} from '@/lib/aiValidation';
import { checkRateLimit } from '@/lib/rateLimit';
import { enforceAiUsage } from '@/lib/aiAccess';
import { resolveGeminiModel } from '@/lib/aiModelResolver';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = checkRateLimit(`ai:explain-word:${session.user.id}`, AI_RATE_LIMIT);
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

    const { word, targetLanguage, nativeLanguage, feedbackLanguage } =
      await request.json();
    const wordValue = typeof word === 'string' ? word.trim() : '';

    if (!wordValue) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    if (wordValue.length > MAX_AI_TERM_CHARS) {
      return NextResponse.json(
        { error: 'Word too long', maxChars: MAX_AI_TERM_CHARS },
        { status: 413 }
      );
    }

    const safeTargetLanguage = normalizeTargetLanguage(targetLanguage);
    const safeNativeLanguage = normalizeNativeLanguage(nativeLanguage);
    const safeFeedbackLanguage = normalizeFeedbackLanguage(
      feedbackLanguage,
      safeNativeLanguage
    );

    const usage = await enforceAiUsage({
      userId: session.user.id,
      email: session.user.email,
      units: wordValue.length,
    });
    if (!usage.ok) {
      return NextResponse.json(usage.body, { status: usage.status });
    }

    const model = await resolveGeminiModel();
    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.explainWord(
      wordValue,
      safeTargetLanguage,
      safeNativeLanguage,
      safeFeedbackLanguage
    );

    const response = await gemini.generate(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024,
      model,
    });

    return NextResponse.json({ explanation: response });
  } catch (error) {
    console.error('Word explanation error:', error);
    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'Failed to explain word' },
      { status: 500 }
    );
  }
}
