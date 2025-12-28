import { getAppConfig } from '@/lib/config';
import { PromptId } from '@/lib/aiPromptCatalog';

export const GLOBAL_PROMPT_OVERLAY_KEY = 'GEMINI_PROMPT_OVERLAY_GLOBAL';
export const MAX_PROMPT_OVERLAY_LENGTH = 4000;

export const PROMPT_OVERLAY_KEYS: Record<PromptId, string> = {
  'generate-words': 'GEMINI_PROMPT_OVERLAY_GENERATE_WORDS',
  'parse-text': 'GEMINI_PROMPT_OVERLAY_PARSE_TEXT',
  'extract-image': 'GEMINI_PROMPT_OVERLAY_EXTRACT_IMAGE',
  'tutor-chat': 'GEMINI_PROMPT_OVERLAY_TUTOR_CHAT',
  'explain-word': 'GEMINI_PROMPT_OVERLAY_EXPLAIN_WORD',
  'evaluate-pronunciation': 'GEMINI_PROMPT_OVERLAY_EVALUATE_PRONUNCIATION',
  'pronunciation-summary': 'GEMINI_PROMPT_OVERLAY_PRONUNCIATION_SUMMARY',
};

const normalizeOverlay = (value: string | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

export const getPromptOverlays = async (promptId: PromptId) => {
  const [globalOverlay, promptOverlay] = await Promise.all([
    getAppConfig(GLOBAL_PROMPT_OVERLAY_KEY),
    getAppConfig(PROMPT_OVERLAY_KEYS[promptId]),
  ]);

  return {
    global: normalizeOverlay(globalOverlay),
    prompt: normalizeOverlay(promptOverlay),
  };
};

export const getAllPromptOverlays = async () => {
  const globalOverlay = normalizeOverlay(await getAppConfig(GLOBAL_PROMPT_OVERLAY_KEY));
  const promptEntries = await Promise.all(
    (Object.keys(PROMPT_OVERLAY_KEYS) as PromptId[]).map(async (promptId) => {
      const value = normalizeOverlay(await getAppConfig(PROMPT_OVERLAY_KEYS[promptId]));
      return [promptId, value] as const;
    })
  );

  return {
    global: globalOverlay,
    byPrompt: Object.fromEntries(promptEntries) as Record<PromptId, string>,
  };
};

const buildOverlayBlock = ({
  global,
  prompt,
}: {
  global?: string;
  prompt?: string;
}) => {
  const blocks: string[] = [];
  if (global) {
    blocks.push(`Global admin guidance:\n${global}`);
  }
  if (prompt) {
    blocks.push(`Prompt-specific guidance:\n${prompt}`);
  }

  if (blocks.length === 0) return '';

  return `Admin overlay (do not change output format or schema):\n${blocks.join('\n\n')}\n`;
};

export const applyPromptOverlays = (
  basePrompt: string,
  overlays: { global?: string; prompt?: string }
) => {
  const overlayBlock = buildOverlayBlock(overlays);
  if (!overlayBlock) return basePrompt;

  const marker = 'Respond ONLY in JSON';
  const markerIndex = basePrompt.lastIndexOf(marker);
  if (markerIndex === -1) {
    return `${basePrompt}\n\n${overlayBlock}`;
  }

  return `${basePrompt.slice(0, markerIndex)}${overlayBlock}\n${basePrompt.slice(
    markerIndex
  )}`;
};

export const buildPromptWithOverlays = async (promptId: PromptId, basePrompt: string) => {
  const overlays = await getPromptOverlays(promptId);
  return applyPromptOverlays(basePrompt, overlays);
};
