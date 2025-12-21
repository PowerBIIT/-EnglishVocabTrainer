import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';

interface ExtractedWord {
  target: string;
  phonetic: string;
  native: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ExtractResult {
  category_suggestion: string;
  words: ExtractedWord[];
  notes?: string;
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
      imageBase64,
      mimeType = 'image/jpeg',
      targetLanguage = 'en',
      nativeLanguage = 'pl',
    } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.extractFromImage(targetLanguage, nativeLanguage);

    const response = await gemini.generateWithImage(
      prompt,
      imageBase64,
      mimeType,
      {
        temperature: 0.3,
        maxOutputTokens: 2048,
      }
    );

    const result = parseAIResponse<ExtractResult>(response);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Image extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract words from image' },
      { status: 500 }
    );
  }
}
