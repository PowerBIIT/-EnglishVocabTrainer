import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashToken } from '@/lib/passwordAuth';
import { ensureUserPlan } from '@/lib/userPlan';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_token', request.url)
    );
  }

  try {
    const hashedToken = hashToken(token);

    // Find the verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!verificationToken) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_token', request.url)
      );
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
      return NextResponse.redirect(
        new URL('/login?error=token_expired', request.url)
      );
    }

    // Find and update the user
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=user_not_found', request.url)
      );
    }

    // Update user's emailVerified timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Ensure user plan (handles waitlist/access control)
    await ensureUserPlan(user.id, user.email);

    // Delete the verification token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Redirect to login with success message
    return NextResponse.redirect(
      new URL('/login?verified=true', request.url)
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(
      new URL('/login?error=verification_failed', request.url)
    );
  }
}
