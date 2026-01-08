import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';
import { GeminiApiError, mapGeminiError } from '@/lib/aiErrors';
import { AI_RATE_LIMIT, MAX_UPLOAD_SIZE_BYTES } from '@/lib/apiLimits';
import { normalizeNativeLanguage, normalizeTargetLanguage } from '@/lib/aiValidation';
import { checkRateLimit } from '@/lib/rateLimit';
import { ensureAiAccess } from '@/lib/aiAccess';
import { resolveGeminiModel } from '@/lib/aiModelResolver';
import { buildPromptWithOverlays } from '@/lib/aiPromptOverlay';
import { logAiRequest } from '@/lib/aiTelemetry';
import { recordAiUsage } from '@/lib/aiUsage';

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

const IMAGE_FALLBACK_MODEL = 'gemini-2.5-pro';

const IMAGE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    category_suggestion: { type: 'string' },
    words: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          phonetic: { type: 'string' },
          native: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        },
        required: ['target', 'phonetic', 'native', 'difficulty'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['category_suggestion', 'words'],
};

const shouldRetryImageExtraction = (
  error: unknown,
  modelId: string,
  fallbackModel: string
) => {
  if (modelId === fallbackModel) return false;
  if (error instanceof GeminiApiError) {
    if (
      error.type === 'invalid_api_key' ||
      error.type === 'permission_denied' ||
      error.type === 'rate_limited'
    ) {
      return false;
    }
    return true;
  }
  return true;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = Boolean(session.user.isAdmin);
    if (!isAdmin) {
      const rate = await checkRateLimit(`ai:extract-image:${session.user.id}`, AI_RATE_LIMIT);
      if (!rate.ok) {
        return NextResponse.json(
          { error: 'rate_limited', retryAfter: rate.retryAfter },
          { status: 429, headers: { 'Retry-After': rate.retryAfter.toString() } }
        );
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'api_key_missing' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const targetLanguageRaw = formData.get('targetLanguage');
    const nativeLanguageRaw = formData.get('nativeLanguage');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Image too large', maxBytes: MAX_UPLOAD_SIZE_BYTES },
        { status: 413 }
      );
    }

    const safeTargetLanguage = normalizeTargetLanguage(targetLanguageRaw);
    const safeNativeLanguage = normalizeNativeLanguage(nativeLanguageRaw);
    const allowedImageTypes = new Set([
      'image/jpeg',
      'image/jpg',
      'image/pjpeg',
      'image/png',
      'image/webp',
    ]);
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const extensionMimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const safeMimeType =
      (allowedImageTypes.has(file.type) && file.type) ||
      extensionMimeMap[extension] ||
      '';
    if (!safeMimeType) {
      return NextResponse.json(
        { error: 'Unsupported image format' },
        { status: 415 }
      );
    }

    const access = await ensureAiAccess({
      userId: session.user.id,
      email: session.user.email,
    });
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status });
    }

    const model = await resolveGeminiModel();
    const buffer = Buffer.from(await file.arrayBuffer());
    const imagePayload = buffer.toString('base64');

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.extractFromImage(
      safeTargetLanguage,
      safeNativeLanguage
    );
    const finalPrompt = await buildPromptWithOverlays('extract-image', prompt);

    const buildImageOptions = (modelId: string) => ({
      temperature: 0.2,
      maxOutputTokens: 2048,
      model: modelId,
      thinkingBudget: 0,
      responseMimeType: 'application/json',
      responseSchema: IMAGE_RESPONSE_SCHEMA,
    });

    const languagePair = `${safeNativeLanguage}-${safeTargetLanguage}`;

    const extractWithModel = async (modelId: string) => {
      const startTime = Date.now();
      const response = await gemini.generateWithImageAndMetadata(
        finalPrompt,
        imagePayload,
        safeMimeType,
        buildImageOptions(modelId)
      );
      const durationMs = Date.now() - startTime;
      const totalTokens = response.usage.promptTokenCount + response.usage.candidatesTokenCount;

      await recordAiUsage({ userId: session.user.id, units: totalTokens }).catch(console.error);

      // Log telemetry (async, non-blocking)
      logAiRequest({
        userId: session.user.id,
        feature: 'extract-image',
        model: response.model,
        languagePair,
        inputTokens: response.usage.promptTokenCount,
        outputTokens: response.usage.candidatesTokenCount,
        durationMs,
        success: true,
      }).catch(console.error);

      return parseAIResponse<ExtractResult>(response.content);
    };

    let result: ExtractResult;

    try {
      result = await extractWithModel(model);
    } catch (error) {
      if (!shouldRetryImageExtraction(error, model, IMAGE_FALLBACK_MODEL)) {
        throw error;
      }
      console.warn(
        'Image extraction failed for model',
        model,
        'retrying with',
        IMAGE_FALLBACK_MODEL
      );
      result = await extractWithModel(IMAGE_FALLBACK_MODEL);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Image extraction error:', error);
    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    // Detect truncated JSON response (output token limit exceeded)
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('Invalid JSON') || errorMessage.includes('Expected')) {
      return NextResponse.json(
        { error: 'response_truncated', message: 'AI response was truncated - image has too many words' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract words from image' },
      { status: 500 }
    );
  }
}
