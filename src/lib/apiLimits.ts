export const MAX_UPLOAD_SIZE_MB = 10;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const MAX_AI_TEXT_CHARS = 12000;
export const MAX_AI_CONTEXT_CHARS = 4000;
export const MAX_AI_TOPIC_CHARS = 200;
export const MAX_AI_WORD_COUNT = 30;
export const MAX_AI_TERM_CHARS = 120;

export const MAX_STATE_BYTES = 2 * 1024 * 1024;

export const AI_RATE_LIMIT = {
  limit: 30,
  windowMs: 60_000,
} as const;
