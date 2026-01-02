import { NextRequest, NextResponse } from 'next/server';
import { confirmWaitlistToken, autoApproveWaitlistAndNotify } from '@/lib/waitlist';

const buildRedirect = (request: NextRequest, status: string) => {
  return NextResponse.redirect(new URL(`/waitlist?status=${status}`, request.url));
};

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return buildRedirect(request, 'invalid');
  }

  try {
    const result = await confirmWaitlistToken(token);
    if (!result.ok) {
      return buildRedirect(request, result.reason === 'expired' ? 'expired' : 'invalid');
    }

    const approved = await autoApproveWaitlistAndNotify();
    const wasApproved =
      result.status === 'approved' ||
      approved.some((entry) => entry.id === result.entry.id);

    return buildRedirect(request, wasApproved ? 'approved' : 'confirmed');
  } catch (error) {
    console.error('Waitlist confirmation failed:', error);
    return buildRedirect(request, 'invalid');
  }
}
