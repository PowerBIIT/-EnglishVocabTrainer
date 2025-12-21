import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';

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
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 503 }
      );
    }

    const { text, targetLanguage = 'en', nativeLanguage = 'pl' } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.parseText(text, targetLanguage, nativeLanguage);

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
