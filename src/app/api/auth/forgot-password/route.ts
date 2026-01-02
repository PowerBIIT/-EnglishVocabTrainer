import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateSecureToken,
  hashToken,
  getPasswordResetExpiry,
} from '@/lib/passwordAuth';
import { sendPasswordResetEmail } from '@/lib/authEmail';
import { checkRateLimit } from '@/lib/rateLimit';

type Language = 'pl' | 'en' | 'uk';

const messages = {
  pl: {
    emailRequired: 'Email jest wymagany',
    rateLimited: 'Zbyt wiele prób. Spróbuj ponownie za godzinę.',
    success:
      'Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła.',
    serverError: 'Wystąpił błąd serwera',
  },
  en: {
    emailRequired: 'Email is required',
    rateLimited: 'Too many attempts. Please try again in an hour.',
    success:
      'If an account with this email exists, we have sent a password reset link.',
    serverError: 'A server error occurred',
  },
  uk: {
    emailRequired: 'Email обов\'язковий',
    rateLimited: 'Забагато спроб. Спробуйте ще раз через годину.',
    success:
      'Якщо акаунт з цією адресою існує, ми надіслали посилання для скидання пароля.',
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

    // Rate limiting (3 reset attempts per hour per IP)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `forgot-password:${ip}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, { limit: 3, windowMs: 60 * 60 * 1000 });
    if (!rateLimitResult.ok) {
      return NextResponse.json({ error: t.rateLimited }, { status: 429 });
    }

    // Find user - only email/password users can reset password
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Don't reveal if user exists - always return success
    if (!user || !user.password) {
      return NextResponse.json({ message: t.success });
    }

    // Generate reset token
    const resetToken = generateSecureToken();
    const hashedToken = hashToken(resetToken);

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: getPasswordResetExpiry(),
      },
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail({
        email: normalizedEmail,
        token: resetToken,
        language,
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the request if email fails - security consideration
    }

    return NextResponse.json({ message: t.success });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: messages.pl.serverError },
      { status: 500 }
    );
  }
}
