import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAnalyticsEvent } from '@/lib/analytics';

const EVENT_NAME_PATTERN = /^[a-z0-9_-]{2,64}$/i;

const parseLabel = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: {
    eventName?: unknown;
    feature?: unknown;
    source?: unknown;
    metadata?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const eventName = parseLabel(payload.eventName);
  if (!eventName || !EVENT_NAME_PATTERN.test(eventName)) {
    return NextResponse.json({ error: 'Invalid event name' }, { status: 400 });
  }

  const feature = parseLabel(payload.feature);
  const source = parseLabel(payload.source);
  const metadata =
    payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
      ? (payload.metadata as Record<string, unknown>)
      : undefined;

  await logAnalyticsEvent({
    userId: session.user.id,
    eventName,
    feature,
    source,
    metadata,
  });

  return NextResponse.json({ ok: true });
}
