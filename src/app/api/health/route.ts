import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = async () =>
  NextResponse.json({
    status: 'ok',
    version: process.env.APP_VERSION ?? 'unknown',
    commit: process.env.APP_COMMIT_SHA ?? 'unknown',
    buildTime: process.env.APP_BUILD_TIME ?? 'unknown',
    env: process.env.NODE_ENV ?? 'unknown',
  });
