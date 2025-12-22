import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';
import { AI_RATE_LIMIT, MAX_AI_TEXT_CHARS } from '@/lib/apiLimits';
import { normalizeNativeLanguage, normalizeTargetLanguage } from '@/lib/aiValidation';
import { checkRateLimit } from '@/lib/rateLimit';
import { enforceAiUsage } from '@/lib/aiAccess';

interface ParsedWord {
  target: string;
  phonetic: string;
  native: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ParseResult {
  words: ParsedWord[];
  category_suggestion: string;
  parse_errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = checkRateLimit(`ai:parse-text:${session.user.id}`, AI_RATE_LIMIT);
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

    const { text, targetLanguage, nativeLanguage } = await request.json();
    const textValue = typeof text === 'string' ? text.trim() : '';

    if (!textValue) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (textValue.length > MAX_AI_TEXT_CHARS) {
      return NextResponse.json(
        { error: 'Text too long', maxChars: MAX_AI_TEXT_CHARS },
        { status: 413 }
      );
    }

    const safeTargetLanguage = normalizeTargetLanguage(targetLanguage);
    const safeNativeLanguage = normalizeNativeLanguage(nativeLanguage);

    const usage = await enforceAiUsage({
      userId: session.user.id,
      email: session.user.email,
      units: textValue.length,
    });
    if (!usage.ok) {
      return NextResponse.json(usage.body, { status: usage.status });
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.parseText(
      textValue,
      safeTargetLanguage,
      safeNativeLanguage
    );

    const response = await gemini.generate(prompt, {
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    const result = parseAIResponse<ParseResult>(response);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Text parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse text' },
      { status: 500 }
    );
  }
}
