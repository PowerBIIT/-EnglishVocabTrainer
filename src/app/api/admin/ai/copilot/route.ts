import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/middleware/adminAuth';
import { GeminiService, AI_PROMPTS, parseAIResponse } from '@/lib/gemini';
import { mapGeminiError, classifyGeminiError } from '@/lib/aiErrors';
import { resolveGeminiModel } from '@/lib/aiModelResolver';
import { logAiRequest, logAiRequestError } from '@/lib/aiTelemetry';
import { recordAiUsage } from '@/lib/aiUsage';
import { parseAnalyticsRange } from '@/lib/analyticsRange';
import { ADMIN_CONFIG_FIELDS } from '@/lib/adminConfig';
import { getAllAppConfig } from '@/lib/config';
import {
  MAX_PROMPT_OVERLAY_LENGTH,
  PROMPT_OVERLAY_KEYS,
  getAllPromptOverlays,
} from '@/lib/aiPromptOverlay';
import { getPromptCatalog, type PromptId } from '@/lib/aiPromptCatalog';
import { GEMINI_MODELS, isGeminiModelId } from '@/lib/aiModelCatalog';
import type {
  AdminCopilotAction,
  AdminCopilotRequest,
  AdminCopilotResponse,
} from '@/types/adminCopilot';
import type { FeedbackLanguage } from '@/types';

type CopilotParsedResponse = {
  reply?: string;
  actions?: unknown;
};

const VOCAB_INTAKE_EVENTS = [
  'vocab_parse_text',
  'vocab_extract_image',
  'vocab_extract_file',
  'vocab_generate_words',
];

const MAX_ACTIONS = 4;
const MAX_MESSAGE_CHARS = 2000;

const readEnvValue = (key: string) => {
  const value = process.env[key];
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveConfigValue = (stored: Map<string, string>, key: string, fallback: string) =>
  stored.get(key) ?? readEnvValue(key) ?? fallback;

const pickConfigDefaults = () =>
  new Map(ADMIN_CONFIG_FIELDS.map((field) => [field.key, field.defaultValue]));

const buildDateRange = (input?: { start?: string; end?: string }) => {
  const params = new URLSearchParams();
  if (input?.start) params.set('start', input.start);
  if (input?.end) params.set('end', input.end);
  return parseAnalyticsRange(params);
};

const normalizeActions = (raw: unknown): AdminCopilotAction[] => {
  if (!Array.isArray(raw)) return [];
  const allowedConfig = new Set(ADMIN_CONFIG_FIELDS.map((field) => field.key));
  const allowedModels = new Set(GEMINI_MODELS.map((model) => model.id));
  const allowedPromptIds = new Set(Object.keys(PROMPT_OVERLAY_KEYS));

  const sanitized: AdminCopilotAction[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const action = entry as Record<string, unknown>;
    const type = typeof action.type === 'string' ? action.type.trim() : '';

    if (type === 'set_config') {
      const key = typeof action.key === 'string' ? action.key.trim() : '';
      if (!allowedConfig.has(key)) continue;
      const value =
        typeof action.value === 'string'
          ? action.value.trim()
          : action.value != null
            ? String(action.value).trim()
            : '';
      const reason = typeof action.reason === 'string' ? action.reason.trim() : undefined;
      if (!value && value !== '') continue;
      sanitized.push({ type: 'set_config', key, value, reason });
    }

    if (type === 'set_model') {
      const model = typeof action.model === 'string' ? action.model.trim() : '';
      if (!model || !isGeminiModelId(model) || !allowedModels.has(model)) continue;
      const reason = typeof action.reason === 'string' ? action.reason.trim() : undefined;
      sanitized.push({ type: 'set_model', model, reason });
    }

    if (type === 'set_overlay') {
      const scope = action.scope === 'prompt' ? 'prompt' : 'global';
      const promptId =
        scope === 'prompt' && typeof action.promptId === 'string'
          ? action.promptId.trim()
          : undefined;
      if (scope === 'prompt' && (!promptId || !allowedPromptIds.has(promptId))) {
        continue;
      }
      const overlay = typeof action.overlay === 'string' ? action.overlay.trim() : '';
      if (!overlay || overlay.length > MAX_PROMPT_OVERLAY_LENGTH) continue;
      const reason = typeof action.reason === 'string' ? action.reason.trim() : undefined;
      sanitized.push({
        type: 'set_overlay',
        scope,
        promptId: promptId as PromptId | undefined,
        overlay,
        reason,
      });
    }
  }

  return sanitized.slice(0, MAX_ACTIONS);
};

const buildConversationContext = async (sessionId: string) => {
  const messages = await prisma.revenueChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 10,
    select: { role: true, content: true },
  });

  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
  }));
};

const buildContextPayload = async (
  range: ReturnType<typeof buildDateRange>,
  activeModel: string
) => {
  const eventWhere = {
    createdAt: { gte: range.start, lte: range.end },
  };
  const aiWhere = {
    createdAt: { gte: range.start, lte: range.end },
  };

  const [
    totalEvents,
    uniqueUsersRaw,
    topEventsRaw,
    pageViewsRaw,
    vocabSourcesRaw,
    aiTotals,
    aiUniqueUsersRaw,
    aiTopFeaturesRaw,
    aiTopModelsRaw,
    aiErrorCount,
    aiErrorsRaw,
    activeSubscriptions,
    recentSubscriptions,
    promptOverlays,
    storedConfig,
  ] = await Promise.all([
    prisma.analyticsEvent.count({ where: eventWhere }),
    prisma.analyticsEvent.findMany({
      where: eventWhere,
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      where: eventWhere,
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['feature'],
      where: { ...eventWhere, eventName: 'page_view', feature: { not: '' } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 6,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['source'],
      where: { ...eventWhere, eventName: { in: VOCAB_INTAKE_EVENTS }, source: { not: '' } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 6,
    }),
    prisma.aiRequestLog.aggregate({
      where: aiWhere,
      _count: { _all: true },
      _sum: { totalTokens: true, totalCost: true },
      _avg: { durationMs: true },
    }),
    prisma.aiRequestLog.findMany({
      where: aiWhere,
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.aiRequestLog.groupBy({
      by: ['feature'],
      where: aiWhere,
      _count: { _all: true },
      _sum: { totalTokens: true, totalCost: true },
      orderBy: { _sum: { totalCost: 'desc' } },
      take: 6,
    }),
    prisma.aiRequestLog.groupBy({
      by: ['model'],
      where: aiWhere,
      _count: { _all: true },
      _sum: { totalTokens: true, totalCost: true },
      orderBy: { _sum: { totalCost: 'desc' } },
      take: 6,
    }),
    prisma.aiRequestLog.count({
      where: { ...aiWhere, success: false },
    }),
    prisma.aiRequestLog.groupBy({
      by: ['errorType'],
      where: { ...aiWhere, success: false, errorType: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.subscription.count({
      where: { status: 'ACTIVE' },
    }),
    prisma.subscription.findMany({
      where: { createdAt: { gte: range.start } },
      select: {
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    }),
    getAllPromptOverlays(),
    getAllAppConfig(),
  ]);

  const uniqueUsers = uniqueUsersRaw.length;
  const aiUniqueUsers = aiUniqueUsersRaw.length;
  const totalAiRequests = aiTotals._count._all;
  const totalAiCost = aiTotals._sum.totalCost ?? 0;
  const totalAiTokens = aiTotals._sum.totalTokens ?? 0;
  const aiErrorRate = totalAiRequests > 0 ? (aiErrorCount / totalAiRequests) * 100 : 0;

  const newSubscriptions = recentSubscriptions.length;
  const canceledSubscriptions = recentSubscriptions.filter(
    (s) => s.cancelAtPeriodEnd || s.status === 'CANCELED'
  ).length;
  const trialConversion =
    newSubscriptions > 0
      ? ((newSubscriptions - canceledSubscriptions) / newSubscriptions) * 100
      : 0;
  const churnRate =
    activeSubscriptions > 0 ? (canceledSubscriptions / activeSubscriptions) * 100 : 0;

  const proPrice = 999;
  const mrr = activeSubscriptions * proPrice;
  const arr = mrr * 12;

  const aiCostPerUser = aiUniqueUsers > 0 ? totalAiCost / aiUniqueUsers : 0;

  const defaults = pickConfigDefaults();
  const configValue = (key: string) =>
    resolveConfigValue(storedConfig, key, defaults.get(key) ?? '');

  const promptCatalog = getPromptCatalog().map((prompt) => ({
    id: prompt.id,
    label: prompt.label,
    description: prompt.description,
  }));

  const overlayEntries = Object.entries(promptOverlays.byPrompt)
    .filter(([, value]) => value)
    .map(([promptId, value]) => ({
      promptId,
      overlay: value.slice(0, 500),
    }));

  return {
    period: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      days: range.days,
    },
    analytics: {
      events: totalEvents,
      uniqueUsers,
      topEvents: topEventsRaw.map((row) => ({
        eventName: row.eventName,
        count: row._count._all,
      })),
      pageViews: pageViewsRaw.map((row) => ({
        feature: row.feature,
        count: row._count._all,
      })),
      vocabSources: vocabSourcesRaw.map((row) => ({
        source: row.source,
        count: row._count._all,
      })),
    },
    aiUsage: {
      requests: totalAiRequests,
      tokens: totalAiTokens,
      cost: totalAiCost,
      avgDurationMs: Math.round(aiTotals._avg.durationMs ?? 0),
      errorRate: Math.round(aiErrorRate * 10) / 10,
      uniqueUsers: aiUniqueUsers,
      topFeatures: aiTopFeaturesRaw.map((row) => ({
        feature: row.feature,
        requests: row._count._all,
        tokens: row._sum.totalTokens ?? 0,
        cost: row._sum.totalCost ?? 0,
      })),
      topModels: aiTopModelsRaw.map((row) => ({
        model: row.model,
        requests: row._count._all,
        tokens: row._sum.totalTokens ?? 0,
        cost: row._sum.totalCost ?? 0,
      })),
      topErrors: aiErrorsRaw.map((row) => ({
        errorType: row.errorType ?? 'unknown',
        count: row._count._all,
      })),
    },
    revenue: {
      mrr,
      arr,
      activeSubscribers: activeSubscriptions,
      trialConversion: Math.round(trialConversion * 10) / 10,
      churnRate: Math.round(churnRate * 10) / 10,
      aiCostPerUser,
    },
    aiConfig: {
      activeModel,
      overlays: {
        global: promptOverlays.global ? promptOverlays.global.slice(0, 500) : '',
        byPrompt: overlayEntries,
      },
      limits: {
        maxActiveUsers: configValue('MAX_ACTIVE_USERS'),
        freeRequests: configValue('FREE_AI_REQUESTS_PER_MONTH'),
        freeTokens: configValue('FREE_AI_UNITS_PER_MONTH'),
        proRequests: configValue('PRO_AI_REQUESTS_PER_MONTH'),
        proTokens: configValue('PRO_AI_UNITS_PER_MONTH'),
        globalRequests: configValue('GLOBAL_AI_REQUESTS_PER_MONTH'),
        globalTokens: configValue('GLOBAL_AI_UNITS_PER_MONTH'),
      },
      costAlerts: {
        thresholdUsd: configValue('AI_COST_ALERT_THRESHOLD_USD'),
        checkIntervalMinutes: configValue('AI_COST_ALERT_CHECK_INTERVAL_MINUTES'),
        webhookConfigured: Boolean(configValue('AI_COST_ALERT_WEBHOOK_URL')),
      },
    },
    available: {
      models: GEMINI_MODELS.map((model) => model.id),
      promptIds: promptCatalog.map((prompt) => prompt.id),
      configKeys: ADMIN_CONFIG_FIELDS.map((field) => field.key),
    },
    promptCatalog,
  };
};

const buildSessionId = () =>
  `adm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const parseCopilotResponse = (raw: string) => {
  try {
    return parseAIResponse<CopilotParsedResponse>(raw);
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key_missing' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as AdminCopilotRequest | null;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const messageText = message.slice(0, MAX_MESSAGE_CHARS);
  const range = buildDateRange(body?.range);
  const feedbackLanguage: FeedbackLanguage =
    body?.language === 'en' ? 'en' : 'pl';

  try {
    const model = await resolveGeminiModel();
    const contextPayload = await buildContextPayload(range, model);
    const conversation = sessionId ? await buildConversationContext(sessionId) : [];

    const context = JSON.stringify(
      {
        ...contextPayload,
        conversation,
      },
      null,
      2
    );

    const activeSessionId = sessionId || buildSessionId();

    await prisma.revenueChatMessage.create({
      data: {
        sessionId: activeSessionId,
        role: 'user',
        content: messageText,
        contextSnapshot: JSON.parse(JSON.stringify(contextPayload)),
      },
    });

    const gemini = new GeminiService(apiKey);
    const prompt = AI_PROMPTS.adminCopilot(context, messageText, feedbackLanguage);

    const startTime = Date.now();
    const result = await gemini.generateWithMetadata(prompt, {
      temperature: 0.6,
      maxOutputTokens: 1024,
      model,
      responseMimeType: 'application/json',
    });
    const durationMs = Date.now() - startTime;
    const totalTokens = result.usage.promptTokenCount + result.usage.candidatesTokenCount;

    await recordAiUsage({ userId: session.user.id, units: totalTokens }).catch(console.error);

    logAiRequest({
      userId: session.user.id,
      sessionId: activeSessionId,
      feature: 'admin-copilot',
      model: result.model,
      inputTokens: result.usage.promptTokenCount,
      outputTokens: result.usage.candidatesTokenCount,
      durationMs,
      success: true,
    }).catch(console.error);

    const parsed = parseCopilotResponse(result.content);
    const reply =
      typeof parsed?.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : result.content.trim();
    const actions = normalizeActions(parsed?.actions);

    await prisma.revenueChatMessage.create({
      data: {
        sessionId: activeSessionId,
        role: 'assistant',
        content: reply,
      },
    });

    const response: AdminCopilotResponse = {
      sessionId: activeSessionId,
      reply,
      actions,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorType =
      error instanceof Error
        ? classifyGeminiError(500, error.message)
        : 'unknown';
    logAiRequestError({
      userId: session.user.id,
      feature: 'admin-copilot',
      model: 'unknown',
      durationMs: 0,
      errorType,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }).catch(console.error);

    const mapped = mapGeminiError(error);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
