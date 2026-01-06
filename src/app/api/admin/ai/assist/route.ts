import { NextResponse } from 'next/server';
import { requireAdmin } from '@/middleware/adminAuth';
import { GeminiService, parseAIResponse } from '@/lib/gemini';
import { mapGeminiError, classifyGeminiError } from '@/lib/aiErrors';
import { resolveGeminiModel } from '@/lib/aiModelResolver';
import { getPromptCatalog, getPromptDefinition, type PromptId } from '@/lib/aiPromptCatalog';
import { buildAiCostLimitPayload, checkAiCostLimit } from '@/lib/aiCostLimit';
import { logAiRequest, logAiRequestError } from '@/lib/aiTelemetry';
import { recordAiUsage } from '@/lib/aiUsage';

type AssistRequest = {
  promptId: PromptId | 'global';
  goal?: string;
  currentOverlay?: string;
};

type AssistResponse = {
  suggestedOverlay: string;
  notes?: string;
};

const MAX_OVERLAY_CHARS = 1200;

const decodeJsonString = (value: string) =>
  value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');

const extractJsonField = (value: string, field: string) => {
  const doubleQuoted = new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,|})`);
  const singleQuoted = new RegExp(`'${field}'\\s*:\\s*'([\\s\\S]*?)'\\s*(?:,|})`);
  const match = value.match(doubleQuoted) ?? value.match(singleQuoted);
  if (!match) return '';
  return decodeJsonString(match[1]).trim();
};

const trimOverlay = (value: string) =>
  value.length > MAX_OVERLAY_CHARS ? value.slice(0, MAX_OVERLAY_CHARS) : value;

const extractOverlayFallback = (value: string) => {
  const cleaned = value
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
  if (!cleaned) return '';

  const extractedOverlay = extractJsonField(cleaned, 'suggestedOverlay');
  if (extractedOverlay) return trimOverlay(extractedOverlay);

  const lines = cleaned
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
  if (lines.length === 0) return '';

  const overlay = lines.join('\n');
  return trimOverlay(overlay);
};

const parseAssistResponse = (response: string): AssistResponse => {
  try {
    return parseAIResponse<AssistResponse>(response);
  } catch (error) {
    const fallbackOverlay = extractOverlayFallback(response);
    if (!fallbackOverlay) {
      throw error;
    }
    console.warn('Admin assist returned non-JSON response. Falling back to text overlay.');
    const fallbackNotes = extractJsonField(response, 'notes');
    return {
      suggestedOverlay: fallbackOverlay,
      notes: fallbackNotes || 'Auto-extracted from plain text response.',
    };
  }
};

const buildAdminAssistPrompt = ({
  scope,
  goal,
  currentOverlay,
  basePrompt,
  promptSummaries,
}: {
  scope: string;
  goal: string;
  currentOverlay: string;
  basePrompt?: string;
  promptSummaries?: string;
}) => `
You are an AI assistant helping an application admin refine prompt overlays.
Overlays are short, additive instructions appended to a base prompt.
Do NOT rewrite the base prompt. Do NOT include the base prompt text in the output.
Keep overlays concise, safe, and focused. Maintain any required output format (especially JSON-only responses).

Scope: ${scope}
Admin goal: "${goal}"
Current overlay: "${currentOverlay || 'none'}"

${basePrompt ? `Base prompt:\n"""\n${basePrompt}\n"""` : ''}
${promptSummaries ? `Available prompts:\n${promptSummaries}` : ''}

Respond ONLY in JSON (no markdown):
{
  "suggestedOverlay": "...",
  "notes": "optional short note for the admin"
}
`.trim();

const buildPromptSummaries = () =>
  getPromptCatalog()
    .map((prompt) => `- ${prompt.id}: ${prompt.label} (${prompt.description})`)
    .join('\n');

const isPromptId = (value: string): value is PromptId =>
  getPromptCatalog().some((prompt) => prompt.id === value);

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as AssistRequest | null;
  const promptIdRaw = typeof body?.promptId === 'string' ? body.promptId.trim() : '';
  const promptId = promptIdRaw || null;
  const goal = typeof body?.goal === 'string' ? body.goal.trim() : '';
  const currentOverlay =
    typeof body?.currentOverlay === 'string' ? body.currentOverlay.trim() : '';

  if (!promptId) {
    return NextResponse.json({ error: 'prompt_id_required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key_missing' }, { status: 503 });
  }

  const costLimit = await checkAiCostLimit();
  if (!costLimit.ok) {
    return NextResponse.json(buildAiCostLimitPayload(costLimit.status), { status: 429 });
  }

  const model = await resolveGeminiModel();
  const gemini = new GeminiService(apiKey);

  const isGlobal = promptId === 'global';
  const resolvedPromptId = !isGlobal && isPromptId(promptId) ? promptId : null;
  const basePrompt = resolvedPromptId
    ? getPromptDefinition(resolvedPromptId)?.build()
    : undefined;

  if (!isGlobal && !basePrompt) {
    return NextResponse.json({ error: 'prompt_not_found' }, { status: 404 });
  }

  const assistPrompt = buildAdminAssistPrompt({
    scope: promptId,
    goal: goal || 'Improve clarity and effectiveness of the prompt overlay.',
    currentOverlay,
    basePrompt,
    promptSummaries: isGlobal ? buildPromptSummaries() : undefined,
  });

  try {
    const startTime = Date.now();
    const response = await gemini.generateWithMetadata(assistPrompt, {
      temperature: 0.6,
      maxOutputTokens: 512,
      model,
      responseMimeType: 'application/json',
    });
    const durationMs = Date.now() - startTime;
    const totalTokens = response.usage.promptTokenCount + response.usage.candidatesTokenCount;

    await recordAiUsage({ userId: session.user.id, units: totalTokens }).catch(console.error);

    logAiRequest({
      userId: session.user.id,
      feature: 'admin-assist',
      model: response.model,
      inputTokens: response.usage.promptTokenCount,
      outputTokens: response.usage.candidatesTokenCount,
      durationMs,
      success: true,
    }).catch(console.error);

    const parsed = parseAssistResponse(response.content);
    const suggestedOverlay =
      typeof parsed.suggestedOverlay === 'string' ? parsed.suggestedOverlay.trim() : '';
    const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : undefined;

    if (!suggestedOverlay) {
      return NextResponse.json({ error: 'invalid_response' }, { status: 502 });
    }

    return NextResponse.json({ suggestedOverlay, notes });
  } catch (error) {
    const errorType =
      error instanceof Error ? classifyGeminiError(500, error.message) : 'unknown';
    logAiRequestError({
      userId: session.user.id,
      feature: 'admin-assist',
      model: 'unknown',
      durationMs: 0,
      errorType,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }).catch(console.error);

    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 });
  }
}
