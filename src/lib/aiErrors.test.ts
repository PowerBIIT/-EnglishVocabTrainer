import { describe, expect, it, afterEach } from 'vitest';
import { classifyGeminiError, GeminiApiError, mapGeminiError } from '@/lib/aiErrors';

describe('ai errors', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('classifies errors by status', () => {
    expect(classifyGeminiError(401, 'UNAUTHENTICATED')).toBe('invalid_api_key');
    expect(classifyGeminiError(403, 'PERMISSION_DENIED')).toBe('permission_denied');
    expect(classifyGeminiError(404, 'NOT_FOUND')).toBe('model_not_found');
    expect(classifyGeminiError(429, 'RESOURCE_EXHAUSTED')).toBe('rate_limited');
    expect(classifyGeminiError(400, 'INVALID_ARGUMENT')).toBe('bad_request');
    expect(classifyGeminiError(504, 'DEADLINE_EXCEEDED')).toBe('timeout');
    expect(classifyGeminiError(503, 'UNAVAILABLE')).toBe('unavailable');
  });

  it('maps GeminiApiError into an API response with detail in dev', () => {
    process.env.NODE_ENV = 'development';
    const error = new GeminiApiError({
      message: 'Bad request',
      status: 400,
      statusText: 'INVALID_ARGUMENT',
      type: 'bad_request',
    });

    const mapped = mapGeminiError(error);
    expect(mapped?.status).toBe(400);
    expect(mapped?.body.error).toBe('ai_bad_request');
    expect(mapped?.body.detail).toBe('Bad request');
    expect(mapped?.body.statusText).toBe('INVALID_ARGUMENT');
  });

  it('omits details in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new GeminiApiError({
      message: 'No response',
      status: 502,
      statusText: 'UNAVAILABLE',
      type: 'unavailable',
    });

    const mapped = mapGeminiError(error);
    expect(mapped?.body.detail).toBeUndefined();
    expect(mapped?.body.statusText).toBeUndefined();
  });

  it('returns null for unknown errors', () => {
    expect(mapGeminiError(new Error('plain'))).toBeNull();
  });
});
