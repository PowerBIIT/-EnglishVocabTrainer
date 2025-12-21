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
      message,
      context,
      targetLanguage = 'en',
      nativeLanguage = 'pl',
      feedbackLanguage = nativeLanguage,
    } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.tutorChat(
      context || '',
      message,
      targetLanguage,
      nativeLanguage,
      feedbackLanguage
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
