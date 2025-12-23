import { NextResponse } from 'next/server';
import { requireAdmin } from '@/middleware/adminAuth';
import { GeminiService, parseAIResponse } from '@/lib/gemini';
import { mapGeminiError } from '@/lib/aiErrors';
import { resolveGeminiModel } from '@/lib/aiModelResolver';
import { getPromptCatalog, getPromptDefinition, type PromptId } from '@/lib/aiPromptCatalog';

type AssistRequest = {
  promptId: PromptId | 'global';
  goal?: string;
  currentOverlay?: string;
};

type AssistResponse = {
  suggestedOverlay: string;
  notes?: string;
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
    const response = await gemini.generate(assistPrompt, {
      temperature: 0.6,
      maxOutputTokens: 512,
      model,
    });
    const parsed = parseAIResponse<AssistResponse>(response);
    const suggestedOverlay =
      typeof parsed.suggestedOverlay === 'string' ? parsed.suggestedOverlay.trim() : '';
    const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : undefined;

    if (!suggestedOverlay) {
      return NextResponse.json({ error: 'invalid_response' }, { status: 502 });
    }

    return NextResponse.json({ suggestedOverlay, notes });
  } catch (error) {
    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 });
  }
}
