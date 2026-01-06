import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'unknown';
const isProdEnv = appEnv === 'production';

interface SubsystemStatus {
  status: 'ok' | 'error' | 'unconfigured';
  message?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  commit: string;
  buildTime: string;
  env: string;
  subsystems: {
    database: SubsystemStatus;
    stripe: SubsystemStatus;
    smtp: SubsystemStatus;
    auth: SubsystemStatus;
    ai: SubsystemStatus;
  };
}

async function checkDatabase(): Promise<SubsystemStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

function checkStripe(): SubsystemStatus {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!secretKey || !webhookSecret || !publishableKey) {
    return {
      status: 'unconfigured',
      message: 'Missing Stripe configuration',
    };
  }

  // Check if using live or test keys
  const isLive = secretKey.startsWith('sk_live_');
  if (isProdEnv && !isLive) {
    return {
      status: 'error',
      message: 'Production using test Stripe keys',
    };
  }

  return { status: 'ok' };
}

function checkAuth(): SubsystemStatus {
  const authUrl = process.env.NEXTAUTH_URL;
  const authSecret = process.env.NEXTAUTH_SECRET;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!authUrl || !authSecret) {
    return {
      status: 'unconfigured',
      message: 'Missing NextAuth configuration',
    };
  }

  if (!googleClientId || !googleClientSecret) {
    return {
      status: 'unconfigured',
      message: 'Missing Google OAuth configuration',
    };
  }

  try {
    const parsed = new URL(authUrl);
    if (isProdEnv && parsed.protocol !== 'https:') {
      return {
        status: 'error',
        message: 'NEXTAUTH_URL must use https in production',
      };
    }
  } catch {
    return {
      status: 'error',
      message: 'NEXTAUTH_URL is invalid',
    };
  }

  return { status: 'ok' };
}

function checkSmtp(): SubsystemStatus {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return {
      status: 'unconfigured',
      message: 'Missing SMTP configuration',
    };
  }

  return { status: 'ok' };
}

function checkAi(): SubsystemStatus {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 'unconfigured',
      message: 'Missing Gemini API configuration',
    };
  }
  return { status: 'ok' };
}

export const GET = async () => {
  const [dbStatus] = await Promise.all([checkDatabase()]);
  const stripeStatus = checkStripe();
  const smtpStatus = checkSmtp();
  const authStatus = checkAuth();
  const aiStatus = checkAi();

  const subsystems = {
    database: dbStatus,
    stripe: stripeStatus,
    smtp: smtpStatus,
    auth: authStatus,
    ai: aiStatus,
  };

  // Determine overall status
  const hasError = Object.values(subsystems).some((s) => s.status === 'error');
  const hasUnconfigured = Object.values(subsystems).some((s) => s.status === 'unconfigured');

  let overallStatus: HealthResponse['status'] = 'ok';
  if (hasError) {
    overallStatus = 'error';
  } else if (hasUnconfigured && isProdEnv) {
    overallStatus = 'degraded';
  }

  const response: HealthResponse = {
    status: overallStatus,
    version: process.env.APP_VERSION ?? 'unknown',
    commit: process.env.APP_COMMIT_SHA ?? 'unknown',
    buildTime: process.env.APP_BUILD_TIME ?? 'unknown',
    env: appEnv,
    subsystems,
  };

  // Return appropriate HTTP status
  const httpStatus = overallStatus === 'error' ? 503 : 200;

  return NextResponse.json(response, { status: httpStatus });
};
