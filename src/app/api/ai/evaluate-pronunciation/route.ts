import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';
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
import { buildPromptWithOverlays } from '@/lib/aiPromptOverlay';

interface PhonemeAnalysis {
  phoneme: string;
  correct: boolean;
  issue?: string;
}

interface EvaluationResult {
  score: number;
  correct: boolean;
  feedback: string;
  tip: string;
  errorPhonemes?: string[];
  phonemeAnalysis?: PhonemeAnalysis[];
  nativeInterference?: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = await checkRateLimit(`ai:evaluate-pronunciation:${session.user.id}`, AI_RATE_LIMIT);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rate.retryAfter, fallback: true },
      { status: 429, headers: { 'Retry-After': rate.retryAfter.toString() } }
    );
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured in .env.local');
      return NextResponse.json(
        { error: 'api_key_missing', fallback: true },
        { status: 200 }
      );
    }

    const {
      expected,
      phonetic,
      spoken,
      nativeLanguage,
      targetLanguage,
      feedbackLanguage,
    } = await request.json();
    const expectedValue = typeof expected === 'string' ? expected.trim() : '';
    const spokenValue = typeof spoken === 'string' ? spoken.trim() : '';

    if (!expectedValue || !spokenValue) {
      return NextResponse.json(
        { error: 'Missing required fields: expected and spoken are required' },
        { status: 400 }
      );
    }

    if (
      expectedValue.length > MAX_AI_TERM_CHARS ||
      spokenValue.length > MAX_AI_TERM_CHARS
    ) {
      return NextResponse.json(
        { error: 'Input too long', maxChars: MAX_AI_TERM_CHARS },
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
      units:
        expectedValue.length +
        spokenValue.length +
        (typeof phonetic === 'string' ? phonetic.length : 0),
    });
    if (!usage.ok) {
      return NextResponse.json(
        { ...usage.body, fallback: true },
        { status: usage.status }
      );
    }

    const model = await resolveGeminiModel();
    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.evaluatePronunciation({
      expected: expectedValue,
      phonetic: typeof phonetic === 'string' ? phonetic : '',
      spoken: spokenValue,
      nativeLanguage: safeNativeLanguage,
      targetLanguage: safeTargetLanguage,
      feedbackLanguage: safeFeedbackLanguage,
    });
    const finalPrompt = await buildPromptWithOverlays(
      'evaluate-pronunciation',
      prompt
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log('Calling Gemini API for pronunciation evaluation...');
      console.log('Expected:', expectedValue, '| Spoken:', spokenValue);
    }

    const response = await gemini.generate(finalPrompt, {
      temperature: 0.3,
      maxOutputTokens: 512,
      model,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Gemini raw response:', response);
    }

    const result = parseAIResponse<EvaluationResult>(response);

    // Validate required fields
    if (typeof result.score !== 'number' || !result.feedback) {
      console.error('Invalid response structure:', result);
      throw new Error('Invalid response structure from Gemini');
    }

    // Ensure score is in valid range
    result.score = Math.max(1, Math.min(10, Math.round(result.score)));
    result.correct = result.score >= 7;

    if (process.env.NODE_ENV !== 'production') {
      console.log('Parsed result:', result);
    }

    return NextResponse.json(result);
  } catch (error) {
    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json(
        { ...mapped.body, fallback: true },
        { status: 200 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pronunciation evaluation error:', errorMessage);

    // Return fallback flag so frontend uses local evaluation
    return NextResponse.json(
      {
        error: 'ai_failed',
        fallback: true,
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : error instanceof Error
              ? error.stack
              : undefined,
      },
      { status: 200 }
    );
  }
}
