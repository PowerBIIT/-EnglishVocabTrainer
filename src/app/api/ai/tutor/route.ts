import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS } from '@/lib/gemini';
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
import { enforceAiUsage } from '@/lib/aiAccess';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = checkRateLimit(`ai:tutor:${session.user.id}`, AI_RATE_LIMIT);
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

    const { message, context, targetLanguage, nativeLanguage, feedbackLanguage } =
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

    const usage = await enforceAiUsage({
      userId: session.user.id,
      email: session.user.email,
      units: messageValue.length + safeContext.length,
    });
    if (!usage.ok) {
      return NextResponse.json(usage.body, { status: usage.status });
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.tutorChat(
      safeContext,
      messageValue,
      safeTargetLanguage,
      safeNativeLanguage,
      safeFeedbackLanguage
    );

    const response = await gemini.generate(prompt, {
      temperature: 0.8,
      maxOutputTokens: 1024,
    });

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Tutor chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get tutor response' },
      { status: 500 }
    );
  }
}
