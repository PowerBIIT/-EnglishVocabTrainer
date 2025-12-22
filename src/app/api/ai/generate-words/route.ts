import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';

interface GeneratedWord {
  target: string;
  phonetic: string;
  native: string;
  example_target?: string;
  example_native?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GenerateResult {
  topic: string;
  level: string;
  words: GeneratedWord[];
  error?: 'UNSAFE_TOPIC' | 'NEEDS_CLARIFICATION';
}

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
      topic,
      count = 10,
      level = 'A2',
      targetLanguage = 'en',
      nativeLanguage = 'pl',
    } = await request.json();

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.generateWords(
      topic,
      count,
      level,
      targetLanguage,
      nativeLanguage
    );

    const response = await gemini.generate(prompt, {
      temperature: 0.8,
      maxOutputTokens: 2048,
    });

    const result = parseAIResponse<GenerateResult>(response);

    if (result.error === 'UNSAFE_TOPIC') {
      return NextResponse.json(
        { error: 'unsafe_topic' },
        { status: 400 }
      );
    }

    if (result.error === 'NEEDS_CLARIFICATION') {
      return NextResponse.json(
        { error: 'needs_clarification' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Word generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate words' },
      { status: 500 }
    );
  }
}
