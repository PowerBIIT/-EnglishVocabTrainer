import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/middleware/adminAuth';
import type { RevenueChatHistoryResponse, RevenueChatMessage } from '@/types/aiAnalytics';

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    // Return list of recent sessions
    const recentSessions = await prisma.revenueChatMessage.groupBy({
      by: ['sessionId'],
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: 20,
    });

    // Get first message of each session for preview
    const sessionIds = recentSessions.map((s) => s.sessionId);
    const firstMessages = await prisma.revenueChatMessage.findMany({
      where: {
        sessionId: { in: sessionIds },
        role: 'user',
      },
      orderBy: { createdAt: 'asc' },
      distinct: ['sessionId'],
      select: {
        sessionId: true,
        content: true,
        createdAt: true,
      },
    });

    const sessionsWithPreview = recentSessions.map((session) => {
      const firstMessage = firstMessages.find((m) => m.sessionId === session.sessionId);
      return {
        sessionId: session.sessionId,
        preview: firstMessage?.content.slice(0, 100) || 'Empty session',
        lastActivity: session._max.createdAt?.toISOString() || '',
      };
    });

    return NextResponse.json({ sessions: sessionsWithPreview });
  }

  // Return messages for specific session
  const messages = await prisma.revenueChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      sessionId: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  const response: RevenueChatHistoryResponse = {
    sessionId,
    messages: messages.map((m): RevenueChatMessage => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };

  return NextResponse.json(response);
}
