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
  logAiRequestError: (...args: unknown[]) => mockLogAiRequest(...args),
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

describe('POST /api/ai/tutor', () => {
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
      user: { id: 'user-1', email: 'user@example.com', isAdmin: false },
    });
    mockCheckRateLimit.mockResolvedValue({ ok: true, retryAfter: 0 });
    mockEnsureAiAccess.mockResolvedValue({ ok: true });
    mockResolveGeminiModel.mockResolvedValue('test-model');
    mockBuildPromptWithOverlays.mockImplementation((_id: string, prompt: string) => prompt);
    mockLogAiRequest.mockResolvedValue(undefined);
    mockRecordAiUsage.mockResolvedValue(undefined);
    mockGenerateWithMetadata.mockResolvedValue({
      content: 'Short response.',
      usage: { promptTokenCount: 10, candidatesTokenCount: 20 },
      model: 'test-model',
    });
  });

  it('uses a larger output budget for longer messages', async () => {
    const { POST } = await loadModule();

    await POST(
      new Request('http://localhost/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hi!',
          context: '',
          targetLanguage: 'en',
          nativeLanguage: 'pl',
          feedbackLanguage: 'pl',
        }),
      })
    );

    await POST(
      new Request('http://localhost/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: new Array(80).fill('explanation').join(' '),
          context: '',
          targetLanguage: 'en',
          nativeLanguage: 'pl',
          feedbackLanguage: 'pl',
        }),
      })
    );

    const shortBudget = mockGenerateWithMetadata.mock.calls[0][1].maxOutputTokens;
    const longBudget = mockGenerateWithMetadata.mock.calls[1][1].maxOutputTokens;

    expect(longBudget).toBeGreaterThan(shortBudget);
  });

  it('includes safety rules in the tutor prompt', async () => {
    const { POST } = await loadModule();

    await POST(
      new Request('http://localhost/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Help me learn.',
          context: '',
          targetLanguage: 'en',
          nativeLanguage: 'pl',
          feedbackLanguage: 'pl',
        }),
      })
    );

    const prompt = mockBuildPromptWithOverlays.mock.calls[0][1] as string;
    expect(prompt).toContain('Safety rules');
    expect(prompt).toContain('refuse briefly');
  });
});
