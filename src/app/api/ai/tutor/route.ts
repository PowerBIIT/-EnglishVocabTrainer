import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS } from '@/lib/gemini';
import { mapGeminiError, classifyGeminiError } from '@/lib/aiErrors';
import {
  AI_RATE_LIMIT,
  MAX_AI_CONTEXT_CHARS,
  MAX_AI_TEXT_CHARS,
} from '@/lib/apiLimits';
import {
  normalizeFeedbackLanguage,
  normalizeNativeLanguage,
  normalizeTargetLanguage,
} from '@/lib/aiValidation';
import { checkRateLimit } from '@/lib/rateLimit';
import { ensureAiAccess } from '@/lib/aiAccess';
import { resolveGeminiModel } from '@/lib/aiModelResolver';
import { buildPromptWithOverlays } from '@/lib/aiPromptOverlay';
import { logAiRequest, logAiRequestError } from '@/lib/aiTelemetry';
import { recordAiUsage } from '@/lib/aiUsage';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await checkRateLimit(`ai:tutor:${session.user.id}`, AI_RATE_LIMIT);
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

    const {
      message,
      context,
      targetLanguage,
      nativeLanguage,
      feedbackLanguage,
      adminMode,
    } =
      await request.json();
    const messageValue = typeof message === 'string' ? message.trim() : '';
    const contextValue = typeof context === 'string' ? context : '';

    if (!messageValue) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (messageValue.length > MAX_AI_TEXT_CHARS) {
      return NextResponse.json(
        { error: 'Message too long', maxChars: MAX_AI_TEXT_CHARS },
        { status: 413 }
      );
    }

    const safeTargetLanguage = normalizeTargetLanguage(targetLanguage);
    const safeNativeLanguage = normalizeNativeLanguage(nativeLanguage);
    const safeFeedbackLanguage = normalizeFeedbackLanguage(
      feedbackLanguage,
      safeNativeLanguage
    );
    const safeContext =
      contextValue.length > MAX_AI_CONTEXT_CHARS
        ? contextValue.slice(-MAX_AI_CONTEXT_CHARS)
        : contextValue;
    const isAdminRequest = Boolean(adminMode) && Boolean(session.user.isAdmin);

    const access = await ensureAiAccess({
      userId: session.user.id,
      email: session.user.email,
    });
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status });
    }

    const model = await resolveGeminiModel();
    const gemini = new GeminiService(apiKey);
    const prompt = isAdminRequest
      ? AI_PROMPTS.adminAssistant(
          safeContext,
          messageValue,
          safeFeedbackLanguage
        )
      : AI_PROMPTS.tutorChat(
          safeContext,
          messageValue,
          safeTargetLanguage,
          safeNativeLanguage,
          safeFeedbackLanguage
        );
    const finalPrompt = await buildPromptWithOverlays('tutor-chat', prompt);

    const startTime = Date.now();
    const result = await gemini.generateWithMetadata(finalPrompt, {
      temperature: 0.8,
      maxOutputTokens: 512,
      model,
    });
    const durationMs = Date.now() - startTime;
    const totalTokens = result.usage.promptTokenCount + result.usage.candidatesTokenCount;

    await recordAiUsage({ userId: session.user.id, units: totalTokens }).catch(console.error);

    // Log telemetry (async, non-blocking)
    const languagePair = `${safeNativeLanguage}-${safeTargetLanguage}`;
    logAiRequest({
      userId: session.user.id,
      feature: isAdminRequest ? 'admin-assistant' : 'tutor',
      model: result.model,
      languagePair: isAdminRequest ? undefined : languagePair,
      inputTokens: result.usage.promptTokenCount,
      outputTokens: result.usage.candidatesTokenCount,
      durationMs,
      success: true,
    }).catch(console.error);

    return NextResponse.json({ response: result.content });
  } catch (error) {
    console.error('Tutor chat error:', error);

    // Log error telemetry
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const errorType = error instanceof Error ? classifyGeminiError(500, error.message) : 'unknown';
      logAiRequestError({
        userId: session.user.id,
        feature: 'tutor',
        model: 'unknown',
        durationMs: 0,
        errorType,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }).catch(console.error);
    }

    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'Failed to get tutor response' },
      { status: 500 }
    );
  }
}
