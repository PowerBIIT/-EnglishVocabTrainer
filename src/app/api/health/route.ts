import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !isLive) {
    return {
      status: 'error',
      message: 'Production using test Stripe keys',
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

export const GET = async () => {
  const [dbStatus] = await Promise.all([checkDatabase()]);
  const stripeStatus = checkStripe();
  const smtpStatus = checkSmtp();

  const subsystems = {
    database: dbStatus,
    stripe: stripeStatus,
    smtp: smtpStatus,
  };

  // Determine overall status
  const hasError = Object.values(subsystems).some((s) => s.status === 'error');
  const hasUnconfigured = Object.values(subsystems).some((s) => s.status === 'unconfigured');

  let overallStatus: HealthResponse['status'] = 'ok';
  if (hasError) {
    overallStatus = 'error';
  } else if (hasUnconfigured) {
    overallStatus = 'degraded';
  }

  const response: HealthResponse = {
    status: overallStatus,
    version: process.env.APP_VERSION ?? 'unknown',
    commit: process.env.APP_COMMIT_SHA ?? 'unknown',
    buildTime: process.env.APP_BUILD_TIME ?? 'unknown',
    env: process.env.NODE_ENV ?? 'unknown',
    subsystems,
  };

  // Return appropriate HTTP status
  const httpStatus = overallStatus === 'error' ? 503 : 200;

  return NextResponse.json(response, { status: httpStatus });
};
