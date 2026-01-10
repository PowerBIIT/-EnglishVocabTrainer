import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateSecureToken,
  getPasswordResetExpiry,
  hashToken,
} from '@/lib/passwordAuth';
import { ensureUserPlan } from '@/lib/userPlan';

const getBaseUrl = (request: NextRequest): string => {
  // Use NEXTAUTH_URL if available (most reliable for production)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  // Fallback to x-forwarded headers (Azure/reverse proxy)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  // Last resort: use request.url
  return new URL(request.url).origin;
};

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', baseUrl));
  }

  try {
    const hashedToken = hashToken(token);

    // Find the verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', baseUrl));
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
      return NextResponse.redirect(new URL('/login?error=token_expired', baseUrl));
    }

    // Find and update the user
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email },
    });

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=user_not_found', baseUrl));
    }

    if (!user.emailVerified) {
      // SECURITY: Avoid account-takeover via "pre-registration" with someone else's email.
      // Email verification must not keep an attacker-chosen password.
      // After verifying, require the email owner to set a password via the reset flow.
      const resetToken = generateSecureToken();
      const hashedResetToken = hashToken(resetToken);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          password: null,
          passwordResetToken: hashedResetToken,
          passwordResetExpires: getPasswordResetExpiry(),
        },
      });

      // Ensure user plan (handles waitlist/access control)
      await ensureUserPlan(user.id, user.email);

      // Delete the verification token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });

      // Redirect to password setup page (reuses reset-password flow)
      return NextResponse.redirect(
        new URL(`/reset-password?token=${resetToken}&verified=true`, baseUrl)
      );
    }

    // Ensure user plan (handles waitlist/access control)
    await ensureUserPlan(user.id, user.email);

    // Delete the verification token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/login?verified=true', baseUrl));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/login?error=verification_failed', baseUrl));
  }
}
