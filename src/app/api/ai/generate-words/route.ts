import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';

interface GeneratedWord {
  en: string;
  phonetic: string;
  pl: string;
  example_en?: string;
  example_pl?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GenerateResult {
  topic: string;
  level: string;
  words: GeneratedWord[];
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

    const { topic, count = 10, level = 'A2' } = await request.json();

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.generateWords(topic, count, level);

    const response = await gemini.generate(prompt, {
      temperature: 0.8,
      maxOutputTokens: 2048,
    });

    const result = parseAIResponse<GenerateResult>(response);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Word generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate words' },
      { status: 500 }
    );
  }
}
