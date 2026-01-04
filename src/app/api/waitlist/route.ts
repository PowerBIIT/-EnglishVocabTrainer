import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { WAITLIST_RATE_LIMIT_EMAIL, WAITLIST_RATE_LIMIT_IP } from '@/lib/apiLimits';
import { createWaitlistEntry } from '@/lib/waitlist';
import { sendWaitlistConfirmationEmail, sendWaitlistAdminNotification } from '@/lib/waitlistEmail';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailRaw = typeof body?.email === 'string' ? body.email.trim() : '';
    const source = typeof body?.source === 'string' ? body.source.trim() : null;
    const language = typeof body?.language === 'string' ? body.language.trim() : null;
    const utmSource = typeof body?.utmSource === 'string' ? body.utmSource.trim() : null;
    const utmMedium = typeof body?.utmMedium === 'string' ? body.utmMedium.trim() : null;
    const utmCampaign = typeof body?.utmCampaign === 'string' ? body.utmCampaign.trim() : null;
    const utmContent = typeof body?.utmContent === 'string' ? body.utmContent.trim() : null;
    const utmTerm = typeof body?.utmTerm === 'string' ? body.utmTerm.trim() : null;

    if (!emailRaw || !EMAIL_REGEX.test(emailRaw)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const email = normalizeEmail(emailRaw);
    const ip = getClientIp(request);

    const ipLimit = await checkRateLimit(`waitlist:ip:${ip}`, WAITLIST_RATE_LIMIT_IP);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: ipLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': ipLimit.retryAfter.toString() } }
      );
    }

    const emailLimit = await checkRateLimit(
      `waitlist:email:${email}`,
      WAITLIST_RATE_LIMIT_EMAIL
    );
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: emailLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': emailLimit.retryAfter.toString() } }
      );
    }

    const metadata = {
      referrer: request.headers.get('referer') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      utm: {
        source: utmSource ?? undefined,
        medium: utmMedium ?? undefined,
        campaign: utmCampaign ?? undefined,
        content: utmContent ?? undefined,
        term: utmTerm ?? undefined,
      },
    };

    const result = await createWaitlistEntry({
      email,
      source,
      language,
      metadata,
    });

    if (result.shouldSendConfirmation && result.token) {
      await sendWaitlistConfirmationEmail({
        email: result.entry.email,
        token: result.token,
        language: result.entry.language,
      });
    }

    // Notify admins about new waitlist signup
    try {
      await sendWaitlistAdminNotification({
        userEmail: result.entry.email,
        source: source,
        language: result.entry.language,
      });
    } catch (notifyError) {
      console.error('Failed to notify admins about waitlist signup:', notifyError);
    }

    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    console.error('Waitlist signup failed:', error);
    return NextResponse.json(
      { error: 'waitlist_unavailable' },
      { status: 500 }
    );
  }
}
