import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';

interface EvaluationResult {
  score: number;
  correct: boolean;
  feedback: string;
  tip: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback to local evaluation if no API key
      return NextResponse.json(
        { error: 'API key not configured', fallback: true },
        { status: 200 }
      );
    }

    const { expected, phonetic, spoken } = await request.json();

    if (!expected || !spoken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.evaluatePronunciation(
      expected,
      phonetic || '',
      spoken
    );

    const response = await gemini.generate(prompt, {
      temperature: 0.3,
      maxOutputTokens: 256,
    });

    const result = parseAIResponse<EvaluationResult>(response);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Pronunciation evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate pronunciation', fallback: true },
      { status: 200 }
    );
  }
}
