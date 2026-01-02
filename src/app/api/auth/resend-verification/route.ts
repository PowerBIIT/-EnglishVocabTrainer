import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateSecureToken,
  hashToken,
  getEmailVerifyExpiry,
} from '@/lib/passwordAuth';
import { sendVerificationEmail } from '@/lib/authEmail';
import { checkRateLimit } from '@/lib/rateLimit';

type Language = 'pl' | 'en' | 'uk';

const messages = {
  pl: {
    emailRequired: 'Email jest wymagany',
    userNotFound: 'Użytkownik nie został znaleziony',
    alreadyVerified: 'Email jest już potwierdzony',
    rateLimited: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.',
    success: 'Email weryfikacyjny został wysłany',
    serverError: 'Wystąpił błąd serwera',
  },
  en: {
    emailRequired: 'Email is required',
    userNotFound: 'User not found',
    alreadyVerified: 'Email is already verified',
    rateLimited: 'Too many attempts. Please try again in a few minutes.',
    success: 'Verification email sent',
    serverError: 'A server error occurred',
  },
  uk: {
    emailRequired: 'Email обов\'язковий',
    userNotFound: 'Користувача не знайдено',
    alreadyVerified: 'Email вже підтверджено',
    rateLimited: 'Забагато спроб. Спробуйте ще раз через кілька хвилин.',
    success: 'Лист підтвердження надіслано',
    serverError: 'Виникла помилка сервера',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, language = 'pl' } = body as {
      email?: string;
      language?: Language;
    };

    const t = messages[language] || messages.pl;

    if (!email?.trim()) {
      return NextResponse.json({ error: t.emailRequired }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limiting (5 resend attempts per 15 minutes per email)
    const rateLimitKey = `resend-verify:${normalizedEmail}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rateLimitResult.ok) {
      return NextResponse.json({ error: t.rateLimited }, { status: 429 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if user exists - return success anyway
      return NextResponse.json({ message: t.success });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: t.alreadyVerified },
        { status: 400 }
      );
    }

    // Check if user has a password (registered with email/password)
    if (!user.password) {
      // OAuth user trying to verify - doesn't make sense
      return NextResponse.json({ message: t.success });
    }

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const hashedToken = hashToken(verificationToken);

    // Delete any existing tokens for this email
    await prisma.emailVerificationToken.deleteMany({
      where: { email: normalizedEmail },
    });

    // Create new verification token
    await prisma.emailVerificationToken.create({
      data: {
        email: normalizedEmail,
        token: hashedToken,
        expires: getEmailVerifyExpiry(),
      },
    });

    // Send verification email
    await sendVerificationEmail({
      email: normalizedEmail,
      token: verificationToken,
      language,
    });

    return NextResponse.json({ message: t.success });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: messages.pl.serverError },
      { status: 500 }
    );
  }
}
