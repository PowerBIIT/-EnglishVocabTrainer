import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, AI_PROMPTS } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 503 }
      );
    }

    const {
      word,
      targetLanguage = 'en',
      nativeLanguage = 'pl',
      feedbackLanguage = nativeLanguage,
    } = await request.json();

    if (!word) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.explainWord(
      word,
      targetLanguage,
      nativeLanguage,
      feedbackLanguage
    );

    const response = await gemini.generate(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024,
    });

    return NextResponse.json({ explanation: response });
  } catch (error) {
    console.error('Word explanation error:', error);
    return NextResponse.json(
      { error: 'Failed to explain word' },
      { status: 500 }
    );
  }
}
