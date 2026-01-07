import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockEnsureAiAccess = vi.hoisted(() => vi.fn());
const mockResolveGeminiModel = vi.hoisted(() => vi.fn());
const mockBuildPromptWithOverlays = vi.hoisted(() => vi.fn());
const mockLogAiRequest = vi.hoisted(() => vi.fn());
const mockRecordAiUsage = vi.hoisted(() => vi.fn());
const mockGenerateWithMetadata = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock('@/lib/aiAccess', () => ({
  ensureAiAccess: (...args: unknown[]) => mockEnsureAiAccess(...args),
}));

vi.mock('@/lib/aiModelResolver', () => ({
  resolveGeminiModel: () => mockResolveGeminiModel(),
}));

vi.mock('@/lib/aiPromptOverlay', () => ({
  buildPromptWithOverlays: (...args: unknown[]) => mockBuildPromptWithOverlays(...args),
}));

vi.mock('@/lib/aiTelemetry', () => ({
  logAiRequest: (...args: unknown[]) => mockLogAiRequest(...args),
}));

vi.mock('@/lib/aiUsage', () => ({
  recordAiUsage: (...args: unknown[]) => mockRecordAiUsage(...args),
}));

vi.mock('@/lib/gemini', async () => {
  const actual = await vi.importActual<typeof import('@/lib/gemini')>('@/lib/gemini');
  const GeminiServiceMock = vi.fn().mockImplementation(function () {
    this.generateWithMetadata = (...args: unknown[]) => mockGenerateWithMetadata(...args);
  });
  return {
    ...actual,
    GeminiService: GeminiServiceMock,
  };
});

const loadModule = async () => {
  vi.resetModules();
  return import('./route');
};

describe('POST /api/ai/generate-words', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';

    mockGetServerSession.mockReset();
    mockCheckRateLimit.mockReset();
    mockEnsureAiAccess.mockReset();
    mockResolveGeminiModel.mockReset();
    mockBuildPromptWithOverlays.mockReset();
    mockLogAiRequest.mockReset();
    mockRecordAiUsage.mockReset();
    mockGenerateWithMetadata.mockReset();

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockCheckRateLimit.mockResolvedValue({ ok: true, retryAfter: 0 });
    mockEnsureAiAccess.mockResolvedValue({ ok: true });
    mockResolveGeminiModel.mockResolvedValue('test-model');
    mockBuildPromptWithOverlays.mockImplementation((_id: string, prompt: string) => prompt);
    mockLogAiRequest.mockResolvedValue(undefined);
    mockRecordAiUsage.mockResolvedValue(undefined);
    mockGenerateWithMetadata.mockResolvedValue({
      content: JSON.stringify({
        topic: 'school',
        level: 'A2',
        words: [
          {
            target: 'desk',
            phonetic: '/desk/',
            native: 'biurko',
            example_target: 'I sit at a desk.',
            example_native: 'Siedze przy biurku.',
            difficulty: 'easy',
          },
        ],
      }),
      usage: { promptTokenCount: 10, candidatesTokenCount: 20 },
      model: 'test-model',
    });
  });

  it('blocks question-like topics before calling AI', async () => {
    const { POST } = await loadModule();
    const response = await POST(
      new Request('http://localhost/api/ai/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Jak zrobic tort?',
          count: 10,
          level: 'A2',
          targetLanguage: 'en',
          nativeLanguage: 'pl',
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toMatchObject({ error: 'topic_question' });
    expect(mockGenerateWithMetadata).not.toHaveBeenCalled();
  });

  it('returns generated words for a normal topic', async () => {
    const { POST } = await loadModule();
    const response = await POST(
      new Request('http://localhost/api/ai/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'school',
          count: 1,
          level: 'A2',
          targetLanguage: 'en',
          nativeLanguage: 'pl',
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.words).toHaveLength(1);
    expect(mockGenerateWithMetadata).toHaveBeenCalledOnce();
  });
});
