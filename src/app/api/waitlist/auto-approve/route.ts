import { NextRequest, NextResponse } from 'next/server';
import { autoApproveWaitlistAndNotify } from '@/lib/waitlist';
import { cleanupUnverifiedUsers } from '@/lib/emailVerificationCleanup';

const getSecret = () => process.env.WAITLIST_CRON_SECRET?.trim();

const authorize = (request: NextRequest) => {
  const secret = getSecret();
  if (!secret) {
    return { ok: false as const, status: 500, error: 'cron_unconfigured' };
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';

  if (!token) {
    return { ok: false as const, status: 401, error: 'unauthorized' };
  }

  if (token !== secret) {
    return { ok: false as const, status: 403, error: 'forbidden' };
  }

  return { ok: true as const };
};

const handleAutoApprove = async (request: NextRequest) => {
  const authResult = authorize(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const approved = await autoApproveWaitlistAndNotify();
    const cleanup = await cleanupUnverifiedUsers();
    return NextResponse.json({ ok: true, approved: approved.length, cleanup });
  } catch (error) {
    console.error('Waitlist auto-approve failed:', error);
    return NextResponse.json({ error: 'waitlist_auto_approve_failed' }, { status: 500 });
  }
};

export async function GET(request: NextRequest) {
  return handleAutoApprove(request);
}

export async function POST(request: NextRequest) {
  return handleAutoApprove(request);
}
