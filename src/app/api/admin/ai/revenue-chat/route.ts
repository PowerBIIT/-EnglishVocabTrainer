import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/middleware/adminAuth';
import { GeminiService, AI_PROMPTS } from '@/lib/gemini';
import { resolveGeminiModel } from '@/lib/aiModelResolver';
import { buildAiCostLimitPayload, checkAiCostLimit } from '@/lib/aiCostLimit';
import { logAiRequest } from '@/lib/aiTelemetry';
import { recordAiUsage } from '@/lib/aiUsage';
import type { RevenueChatRequest, RevenueChatResponse, RevenueContext } from '@/types/aiAnalytics';

function generateSessionId(): string {
  return `rev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

async function gatherRevenueContext(): Promise<RevenueContext> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  // Get subscription stats
  const [activeSubscriptions, allSubscriptions] = await prisma.$transaction([
    prisma.subscription.count({
      where: { status: 'ACTIVE' },
    }),
    prisma.subscription.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    }),
  ]);

  // Calculate trial conversion and churn
  const newSubscriptions = allSubscriptions.length;
  const canceledSubscriptions = allSubscriptions.filter((s) => s.cancelAtPeriodEnd || s.status === 'CANCELED').length;
  const trialConversion = newSubscriptions > 0 ? ((newSubscriptions - canceledSubscriptions) / newSubscriptions) * 100 : 0;
  const churnRate = activeSubscriptions > 0 ? (canceledSubscriptions / activeSubscriptions) * 100 : 0;

  // Get AI usage stats for last 30 days
  const aiStats = await prisma.aiRequestLog.aggregate({
    where: { createdAt: { gte: thirtyDaysAgo } },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalCost: true,
    },
    _count: { _all: true },
  });

  // Get unique active users
  const uniqueUsersResult = await prisma.aiRequestLog.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: thirtyDaysAgo } },
  });
  const uniqueUsers = uniqueUsersResult.length;

  // Get top features by cost
  const topFeaturesRaw = await prisma.aiRequestLog.groupBy({
    by: ['feature'],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: { _all: true },
    _sum: { totalCost: true },
    orderBy: { _sum: { totalCost: 'desc' } },
    take: 5,
  });

  const topFeatures = topFeaturesRaw.map((f) => ({
    name: f.feature,
    usage: f._count._all,
    cost: f._sum.totalCost ?? 0,
  }));

  // Estimate MRR (simplified - assumes $9.99/month for PRO)
  const proPrice = 999; // cents
  const mrr = activeSubscriptions * proPrice;
  const arr = mrr * 12;

  const totalCost = aiStats._sum.totalCost ?? 0;
  const aiCostPerUser = uniqueUsers > 0 ? totalCost / uniqueUsers : 0;

  return {
    mrr,
    arr,
    activeSubscribers: activeSubscriptions,
    trialConversion: Math.round(trialConversion * 10) / 10,
    churnRate: Math.round(churnRate * 10) / 10,
    aiCostPerUser,
    tokens: {
      input: aiStats._sum.inputTokens ?? 0,
      output: aiStats._sum.outputTokens ?? 0,
      cost: totalCost,
    },
    topFeatures,
  };
}

async function buildConversationContext(sessionId: string): Promise<string> {
  const messages = await prisma.revenueChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 10, // Last 10 messages for context
  });

  if (messages.length === 0) return '';

  return messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key_missing' }, { status: 503 });
  }

  const costLimit = await checkAiCostLimit();
  if (!costLimit.ok) {
    return NextResponse.json(buildAiCostLimitPayload(costLimit.status), { status: 429 });
  }

  try {
    const body: RevenueChatRequest = await request.json();
    const { message, sessionId: existingSessionId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const messageText = message.trim().slice(0, 2000); // Limit message length
    const sessionId = existingSessionId || generateSessionId();

    // Gather business context
    const revenueContext = await gatherRevenueContext();
    const conversationContext = await buildConversationContext(sessionId);

    // Save user message
    await prisma.revenueChatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: messageText,
        contextSnapshot: JSON.parse(JSON.stringify(revenueContext)),
      },
    });

    // Build prompt with context
    const model = await resolveGeminiModel();
    const gemini = new GeminiService(apiKey);

    const fullContext = conversationContext
      ? `Previous conversation:\n${conversationContext}\n\n`
      : '';

    const prompt = AI_PROMPTS.revenueStrategy(
      revenueContext,
      fullContext + messageText,
      'en' // Admin chat in English
    );

    const startTime = Date.now();
    const result = await gemini.generateWithMetadata(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024,
      model,
    });
    const durationMs = Date.now() - startTime;
    const totalTokens = result.usage.promptTokenCount + result.usage.candidatesTokenCount;

    await recordAiUsage({ userId: session.user.id, units: totalTokens }).catch(console.error);

    // Log telemetry
    logAiRequest({
      userId: session.user.id,
      feature: 'revenue-chat',
      model: result.model,
      inputTokens: result.usage.promptTokenCount,
      outputTokens: result.usage.candidatesTokenCount,
      durationMs,
      success: true,
    }).catch(console.error);

    // Save assistant response
    await prisma.revenueChatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: result.content,
      },
    });

    const response: RevenueChatResponse = {
      sessionId,
      response: result.content,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Revenue chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
