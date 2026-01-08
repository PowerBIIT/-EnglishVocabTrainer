import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AI_PROMPTS, GeminiService, parseAIResponse } from '@/lib/gemini';
import { mapGeminiError } from '@/lib/aiErrors';
import { AI_RATE_LIMIT, MAX_AI_TEXT_CHARS, MAX_UPLOAD_SIZE_BYTES } from '@/lib/apiLimits';
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
  category_suggestion?: string;
  words: ExtractedWord[];
  notes?: string;
}

const FILE_RESPONSE_SCHEMA = {
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
  required: ['words'],
};

const getExtension = (name: string) =>
  name.split('.').pop()?.toLowerCase() ?? '';

const isPdf = (extension: string, mime: string) =>
  extension === 'pdf' || mime === 'application/pdf';

const isDocx = (extension: string, mime: string) =>
  extension === 'docx' ||
  mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const isText = (extension: string, mime: string) =>
  extension === 'txt' ||
  extension === 'csv' ||
  mime.startsWith('text/') ||
  mime === 'text/csv';

const extractTextFromFile = async (file: File) => {
  const extension = getExtension(file.name);
  const mimeType = file.type || '';
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isPdf(extension, mimeType)) {
    const pdfModule = (await import('pdf-parse')) as unknown as {
      default?: (data: Buffer) => Promise<{ text: string }>;
      (data: Buffer): Promise<{ text: string }>;
    };
    const pdfParse = pdfModule.default ?? pdfModule;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (isDocx(extension, mimeType)) {
    const mammothModule = (await import('mammoth')) as {
      default?: {
        extractRawText: (options: { buffer: Buffer }) => Promise<{ value: string }>;
      };
      extractRawText?: (options: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const extractRawText =
      mammothModule.default?.extractRawText ?? mammothModule.extractRawText;
    if (!extractRawText) {
      throw new Error('Missing DOCX parser');
    }
    const result = await extractRawText({ buffer });
    return result.value;
  }

  if (isText(extension, mimeType)) {
    return buffer.toString('utf-8');
  }

  return '';
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = Boolean(session.user.isAdmin);
    if (!isAdmin) {
      const rate = await checkRateLimit(`ai:extract-file:${session.user.id}`, AI_RATE_LIMIT);
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

    const targetLanguage = normalizeTargetLanguage(targetLanguageRaw);
    const nativeLanguage = normalizeNativeLanguage(nativeLanguageRaw);

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 413 }
      );
    }

    const extension = getExtension(file.name);
    const mimeType = file.type || '';
    if (!isPdf(extension, mimeType) && !isDocx(extension, mimeType) && !isText(extension, mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file format' },
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

    const extractedText = await extractTextFromFile(file);
    const cleanedText = extractedText.replace(/\s+/g, ' ').trim();

    if (!cleanedText) {
      return NextResponse.json({ words: [], notes: 'No text found in file.' });
    }

    const truncated = cleanedText.length > MAX_AI_TEXT_CHARS;
    const safeText = truncated
      ? cleanedText.slice(0, MAX_AI_TEXT_CHARS)
      : cleanedText;
    const notes = truncated
      ? `Input truncated to ${MAX_AI_TEXT_CHARS} characters.`
      : undefined;

    const model = await resolveGeminiModel();
    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.parseText(safeText, targetLanguage, nativeLanguage);
    const finalPrompt = await buildPromptWithOverlays('parse-text', prompt);

    const startTime = Date.now();
    const response = await gemini.generateWithMetadata(finalPrompt, {
      temperature: 0.3,
      maxOutputTokens: 1024,
      model,
      thinkingBudget: 0,
      responseMimeType: 'application/json',
      responseSchema: FILE_RESPONSE_SCHEMA,
    });
    const durationMs = Date.now() - startTime;
    const totalTokens = response.usage.promptTokenCount + response.usage.candidatesTokenCount;

    await recordAiUsage({ userId: session.user.id, units: totalTokens }).catch(console.error);

    // Log telemetry (async, non-blocking)
    const languagePair = `${nativeLanguage}-${targetLanguage}`;
    logAiRequest({
      userId: session.user.id,
      feature: 'extract-file',
      model: response.model,
      languagePair,
      inputTokens: response.usage.promptTokenCount,
      outputTokens: response.usage.candidatesTokenCount,
      durationMs,
      success: true,
    }).catch(console.error);

    const result = parseAIResponse<ExtractResult>(response.content);

    return NextResponse.json({
      ...result,
      notes: result.notes ?? notes,
    });
  } catch (error) {
    console.error('File extraction error:', error);
    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'Failed to extract words from file' },
      { status: 500 }
    );
  }
}
