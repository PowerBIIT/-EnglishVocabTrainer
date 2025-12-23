import { getAppConfig } from '@/lib/config';
import { DEFAULT_GEMINI_MODEL, GEMINI_MODEL_CONFIG_KEY } from '@/lib/aiModelCatalog';

export const resolveGeminiModel = async () => {
  const configured = await getAppConfig(GEMINI_MODEL_CONFIG_KEY);
  const trimmed = configured?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_GEMINI_MODEL;
};
