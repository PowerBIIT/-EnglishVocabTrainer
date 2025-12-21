import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';

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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY not configured in .env.local');
    return NextResponse.json(
      { error: 'API key not configured', fallback: true },
      { status: 200 }
    );
  }

  try {
    const {
      expected,
      phonetic,
      spoken,
      nativeLanguage = 'pl',
      targetLanguage = 'en',
      feedbackLanguage = nativeLanguage,
    } = await request.json();

    if (!expected || !spoken) {
      return NextResponse.json(
        { error: 'Missing required fields: expected and spoken are required' },
        { status: 400 }
      );
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.evaluatePronunciation({
      expected,
      phonetic: phonetic || '',
      spoken,
      nativeLanguage,
      targetLanguage,
      feedbackLanguage,
    });

    console.log('Calling Gemini API for pronunciation evaluation...');
    console.log('Expected:', expected, '| Spoken:', spoken);

    const response = await gemini.generate(prompt, {
      temperature: 0.3,
      maxOutputTokens: 512,
    });

    console.log('Gemini raw response:', response);

    const result = parseAIResponse<EvaluationResult>(response);

    // Validate required fields
    if (typeof result.score !== 'number' || !result.feedback) {
      console.error('Invalid response structure:', result);
      throw new Error('Invalid response structure from Gemini');
    }

    // Ensure score is in valid range
    result.score = Math.max(1, Math.min(10, Math.round(result.score)));
    result.correct = result.score >= 7;

    console.log('Parsed result:', result);

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pronunciation evaluation error:', errorMessage);

    // Return fallback flag so frontend uses local evaluation
    return NextResponse.json(
      {
        error: errorMessage,
        fallback: true,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 200 }
    );
  }
}
