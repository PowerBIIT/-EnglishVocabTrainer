import { NextResponse } from 'next/server';
import { requireAdmin } from '@/middleware/adminAuth';
import { deleteAppConfig, getAllAppConfig, setAppConfig } from '@/lib/config';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_CONFIG_KEY,
  GEMINI_MODELS,
  isGeminiModelId,
} from '@/lib/aiModelCatalog';
import { getPromptCatalog, type PromptId } from '@/lib/aiPromptCatalog';
import {
  GLOBAL_PROMPT_OVERLAY_KEY,
  PROMPT_OVERLAY_KEYS,
  applyPromptOverlays,
  getAllPromptOverlays,
} from '@/lib/aiPromptOverlay';

const readEnvValue = (key: string) => {
  const value = process.env[key];
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stored = await getAllAppConfig();
  const dbValue = stored.get(GEMINI_MODEL_CONFIG_KEY) ?? null;
  const envValue = readEnvValue(GEMINI_MODEL_CONFIG_KEY);
  const value = dbValue ?? envValue ?? DEFAULT_GEMINI_MODEL;
  const source = dbValue ? 'db' : envValue ? 'env' : 'default';
  const overlays = await getAllPromptOverlays();
  const basePrompts = getPromptCatalog();
  const prompts = basePrompts.map((prompt) => ({
    ...prompt,
    effectivePrompt: applyPromptOverlays(prompt.prompt, {
      global: overlays.global,
      prompt: overlays.byPrompt[prompt.id as PromptId],
    }),
  }));

  return NextResponse.json({
    activeModel: {
      value,
      source,
      isKnown: isGeminiModelId(value),
    },
    defaultModel: DEFAULT_GEMINI_MODEL,
    models: GEMINI_MODELS,
    prompts,
    overlays,
  });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const model = typeof body?.model === 'string' ? body.model.trim() : '';
  const overlays = body?.overlays ?? null;

  if (!model) {
    await deleteAppConfig({ key: GEMINI_MODEL_CONFIG_KEY, updatedBy: session.user.id });
  } else {
    if (!isGeminiModelId(model)) {
      return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
    }

    await setAppConfig({
      key: GEMINI_MODEL_CONFIG_KEY,
      value: model,
      updatedBy: session.user.id,
      dataType: 'string',
    });
  }

  if (overlays) {
    if (typeof overlays.global === 'string') {
      const trimmed = overlays.global.trim();
      if (!trimmed) {
        await deleteAppConfig({
          key: GLOBAL_PROMPT_OVERLAY_KEY,
          updatedBy: session.user.id,
        });
      } else {
        await setAppConfig({
          key: GLOBAL_PROMPT_OVERLAY_KEY,
          value: trimmed,
          updatedBy: session.user.id,
          dataType: 'string',
        });
      }
    }

    if (overlays.byPrompt && typeof overlays.byPrompt === 'object') {
      const entries = Object.entries(overlays.byPrompt) as [PromptId, string][];
      for (const [promptId, value] of entries) {
        const key = PROMPT_OVERLAY_KEYS[promptId];
        if (!key || typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (!trimmed) {
          await deleteAppConfig({ key, updatedBy: session.user.id });
        } else {
          await setAppConfig({
            key,
            value: trimmed,
            updatedBy: session.user.id,
            dataType: 'string',
          });
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
