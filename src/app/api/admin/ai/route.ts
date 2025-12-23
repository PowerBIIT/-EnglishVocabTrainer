import { NextResponse } from 'next/server';
import { requireAdmin } from '@/middleware/adminAuth';
import { deleteAppConfig, getAllAppConfig, setAppConfig } from '@/lib/config';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_CONFIG_KEY,
  GEMINI_MODELS,
  isGeminiModelId,
} from '@/lib/aiModelCatalog';
import { getPromptCatalog } from '@/lib/aiPromptCatalog';

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

  return NextResponse.json({
    activeModel: {
      value,
      source,
      isKnown: isGeminiModelId(value),
    },
    defaultModel: DEFAULT_GEMINI_MODEL,
    models: GEMINI_MODELS,
    prompts: getPromptCatalog(),
  });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const model = typeof body?.model === 'string' ? body.model.trim() : '';

  if (!model) {
    await deleteAppConfig({ key: GEMINI_MODEL_CONFIG_KEY, updatedBy: session.user.id });
    return NextResponse.json({ success: true });
  }

  if (!isGeminiModelId(model)) {
    return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
  }

  await setAppConfig({
    key: GEMINI_MODEL_CONFIG_KEY,
    value: model,
    updatedBy: session.user.id,
    dataType: 'string',
  });

  return NextResponse.json({ success: true });
}
