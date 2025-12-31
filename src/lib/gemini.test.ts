import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { GeminiApiError } from '@/lib/aiErrors';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';

describe('gemini service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns text from a successful response', async () => {
    const response = {
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'hello' }] } }],
        })
      ),
    };

    (globalThis.fetch as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue(
      response
    );

    const service = new GeminiService('api-key');
    const result = await service.generate('prompt');

    expect(result).toBe('hello');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('generateContent?key=api-key'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sends inline image data for image prompts', async () => {
    const response = {
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        })
      ),
    };

    const fetchMock = globalThis.fetch as unknown as {
      mockResolvedValue: (value: unknown) => void;
      mock: { calls: Array<[string, { body?: string }]> };
    };
    fetchMock.mockResolvedValue(response);

    const service = new GeminiService('api-key');
    await service.generateWithImage('prompt', 'base64', 'image/png');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.contents[0].parts[1].inlineData).toEqual({
      mimeType: 'image/png',
      data: 'base64',
    });
  });

  it('throws a GeminiApiError for error responses', async () => {
    const response = {
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          error: {
            message: 'Not found',
            code: 404,
            status: 'NOT_FOUND',
          },
        })
      ),
    };

    (globalThis.fetch as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue(
      response
    );

    const service = new GeminiService('api-key');
    await expect(service.generate('prompt')).rejects.toBeInstanceOf(GeminiApiError);
  });

  it('throws when response has no candidates', async () => {
    const response = {
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({})),
    };

    (globalThis.fetch as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue(
      response
    );

    const service = new GeminiService('api-key');
    await expect(service.generate('prompt')).rejects.toBeInstanceOf(GeminiApiError);
  });

  it('wraps abort errors as timeouts', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    (globalThis.fetch as unknown as { mockRejectedValue: (value: unknown) => void }).mockRejectedValue(
      abortError
    );

    const service = new GeminiService('api-key');
    await expect(service.generate('prompt')).rejects.toMatchObject({
      name: 'GeminiApiError',
      type: 'timeout',
    });
  });
});

describe('gemini prompts', () => {
  it('builds all prompts with expected markers', () => {
    expect(
      AI_PROMPTS.evaluatePronunciation({
        expected: 'apple',
        phonetic: '/apple/',
        spoken: 'apple',
        nativeLanguage: 'pl',
        targetLanguage: 'en',
        feedbackLanguage: 'en',
      })
    ).toContain('Respond ONLY in JSON');

    expect(
      AI_PROMPTS.pronunciationSummary({
        averageScore: 8,
        passingScore: 7,
        focusMode: 'random',
        targetLanguage: 'en',
        nativeLanguage: 'pl',
        feedbackLanguage: 'en',
        words: [{ word: 'apple', phonetic: '/apple/', score: 8 }],
      })
    ).toContain('Respond ONLY in JSON');

    expect(AI_PROMPTS.generateWords('travel', 3, 'A2', 'en', 'pl')).toContain(
      'Respond ONLY in JSON'
    );
    expect(AI_PROMPTS.parseText('apple - jablko', 'en', 'pl')).toContain(
      'Respond ONLY in JSON'
    );
    expect(AI_PROMPTS.extractFromImage('en', 'pl')).toContain('Respond ONLY in JSON');
    expect(AI_PROMPTS.tutorChat('context', 'hello', 'en', 'pl', 'en')).toContain(
      'You are a friendly AI tutor'
    );
    expect(AI_PROMPTS.adminAssistant('context', 'hello', 'en')).toContain('AI assistant');
    expect(AI_PROMPTS.explainWord('apple', 'en', 'pl', 'en')).toContain('Explain the following');
  });
});

describe('parseAIResponse', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('parses JSON inside code blocks', () => {
    const response = '```json\n{"ok":true}\n```';
    expect(parseAIResponse<{ ok: boolean }>(response)).toEqual({ ok: true });
  });

  it('extracts JSON from surrounding text', () => {
    const response = 'Here is the answer: {"ok":true} End.';
    expect(parseAIResponse<{ ok: boolean }>(response)).toEqual({ ok: true });
  });

  it('throws on invalid JSON and logs in dev', () => {
    process.env.NODE_ENV = 'development';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => parseAIResponse('not json')).toThrow('Invalid JSON response');
    expect(spy).toHaveBeenCalled();
  });
});
