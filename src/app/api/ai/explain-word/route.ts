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
import { ensureAiAccess } from '@/lib/aiAccess';
import { resolveGeminiModel } from '@/lib/aiModelResolver';
import { buildPromptWithOverlays } from '@/lib/aiPromptOverlay';
import { logAiRequest } from '@/lib/aiTelemetry';
import { recordAiUsage } from '@/lib/aiUsage';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await checkRateLimit(`ai:explain-word:${session.user.id}`, AI_RATE_LIMIT);
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

    const access = await ensureAiAccess({
      userId: session.user.id,
      email: session.user.email,
    });
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status });
    }

    const model = await resolveGeminiModel();
    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.explainWord(
      wordValue,
      safeTargetLanguage,
      safeNativeLanguage,
      safeFeedbackLanguage
    );
    const finalPrompt = await buildPromptWithOverlays('explain-word', prompt);

    const startTime = Date.now();
    const result = await gemini.generateWithMetadata(finalPrompt, {
      temperature: 0.7,
      maxOutputTokens: 1024,
      model,
    });
    const durationMs = Date.now() - startTime;
    const totalTokens = result.usage.promptTokenCount + result.usage.candidatesTokenCount;

    await recordAiUsage({ userId: session.user.id, units: totalTokens }).catch(console.error);

    // Log telemetry (async, non-blocking)
    const languagePair = `${safeNativeLanguage}-${safeTargetLanguage}`;
    logAiRequest({
      userId: session.user.id,
      feature: 'explain-word',
      model: result.model,
      languagePair,
      inputTokens: result.usage.promptTokenCount,
      outputTokens: result.usage.candidatesTokenCount,
      durationMs,
      success: true,
    }).catch(console.error);

    return NextResponse.json({ explanation: result.content });
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
