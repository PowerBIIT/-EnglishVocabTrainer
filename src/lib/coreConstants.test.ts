import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FREE_LIMITS,
  DEFAULT_GLOBAL_LIMITS,
  DEFAULT_MAX_ACTIVE_USERS,
  DEFAULT_PRO_LIMITS,
} from '@/lib/configDefaults';
import { ADMIN_CONFIG_FIELDS } from '@/lib/adminConfig';
import {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
  MAX_AI_CONTEXT_CHARS,
  MAX_AI_TEXT_CHARS,
  MAX_AI_TOPIC_CHARS,
  MAX_AI_WORD_COUNT,
  MAX_AI_TERM_CHARS,
  MAX_STATE_BYTES,
  AI_RATE_LIMIT,
} from '@/lib/apiLimits';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODELS,
  getGeminiModelInfo,
  isGeminiModelId,
} from '@/lib/aiModelCatalog';

describe('config defaults and admin config', () => {
  it('exposes default limits', () => {
    expect(DEFAULT_MAX_ACTIVE_USERS).toBe(Number.POSITIVE_INFINITY);
    expect(DEFAULT_FREE_LIMITS.maxRequests).toBeGreaterThan(0);
    expect(DEFAULT_PRO_LIMITS.maxUnits).toBeGreaterThan(DEFAULT_FREE_LIMITS.maxUnits);
    expect(DEFAULT_GLOBAL_LIMITS.maxRequests).toBeGreaterThan(DEFAULT_PRO_LIMITS.maxRequests);
  });

  it('builds admin config fields with defaults', () => {
    const maxUsers = ADMIN_CONFIG_FIELDS.find((field) => field.key === 'MAX_ACTIVE_USERS');
    expect(maxUsers?.defaultValue).toBe('unlimited');

    const freeRequests = ADMIN_CONFIG_FIELDS.find(
      (field) => field.key === 'FREE_AI_REQUESTS_PER_MONTH'
    );
    expect(freeRequests?.defaultValue).toBe(String(DEFAULT_FREE_LIMITS.maxRequests));
  });
});

describe('api limits', () => {
  it('keeps derived constants in sync', () => {
    expect(MAX_UPLOAD_SIZE_BYTES).toBe(MAX_UPLOAD_SIZE_MB * 1024 * 1024);
    expect(MAX_AI_TEXT_CHARS).toBeGreaterThan(MAX_AI_CONTEXT_CHARS);
    expect(MAX_AI_TOPIC_CHARS).toBeLessThan(MAX_AI_TEXT_CHARS);
    expect(MAX_AI_WORD_COUNT).toBeGreaterThan(0);
    expect(MAX_AI_TERM_CHARS).toBeGreaterThan(0);
    expect(MAX_STATE_BYTES).toBeGreaterThan(0);
    expect(AI_RATE_LIMIT.windowMs).toBeGreaterThan(0);
  });
});

describe('ai model catalog', () => {
  it('exposes a default model present in the catalog', () => {
    const defaultModel = getGeminiModelInfo(DEFAULT_GEMINI_MODEL);
    expect(defaultModel).toBeDefined();
    expect(GEMINI_MODELS.length).toBeGreaterThan(0);
  });

  it('validates model ids', () => {
    expect(isGeminiModelId(DEFAULT_GEMINI_MODEL)).toBe(true);
    expect(isGeminiModelId('unknown-model')).toBe(false);
  });
});
