import { getAppConfig } from '@/lib/config';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_CONFIG_KEY,
  isGeminiModelId,
} from '@/lib/aiModelCatalog';
import { hasPricingForModel } from '@/lib/costEstimation';

export const resolveGeminiModel = async () => {
  const configured = await getAppConfig(GEMINI_MODEL_CONFIG_KEY);
  const trimmed = configured?.trim();
  if (!trimmed) return DEFAULT_GEMINI_MODEL;
  const normalized = trimmed.toLowerCase();
  if (!isGeminiModelId(normalized) && !hasPricingForModel(normalized)) {
    console.warn('Unsupported Gemini model configured. Falling back to default.', {
      model: trimmed,
    });
    return DEFAULT_GEMINI_MODEL;
  }
  return normalized;
};
