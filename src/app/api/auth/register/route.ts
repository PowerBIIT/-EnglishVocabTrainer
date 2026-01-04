import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  hashPassword,
  validatePasswordStrength,
  generateSecureToken,
  hashToken,
  getEmailVerifyExpiry,
} from '@/lib/passwordAuth';
import { sendVerificationEmail, sendNewUserNotification } from '@/lib/authEmail';
import { checkRateLimit } from '@/lib/rateLimit';

type Language = 'pl' | 'en' | 'uk';

const messages = {
  pl: {
    emailRequired: 'Email jest wymagany',
    passwordRequired: 'Hasło jest wymagane',
    passwordConfirmRequired: 'Potwierdzenie hasła jest wymagane',
    passwordMismatch: 'Hasła nie są identyczne',
    consentRequired: 'Musisz zaakceptować regulamin i politykę prywatności',
    ageRequired: 'Musisz potwierdzić, że masz co najmniej 16 lat',
    emailExists: 'Konto z tym adresem email już istnieje',
    rateLimited: 'Zbyt wiele prób rejestracji. Spróbuj ponownie za godzinę.',
    success: 'Rejestracja pomyślna. Sprawdź swoją skrzynkę email, aby potwierdzić konto.',
    serverError: 'Wystąpił błąd serwera. Spróbuj ponownie później.',
  },
  en: {
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    passwordConfirmRequired: 'Password confirmation is required',
    passwordMismatch: 'Passwords do not match',
    consentRequired: 'You must accept the terms and privacy policy',
    ageRequired: 'You must confirm that you are at least 16 years old',
    emailExists: 'An account with this email already exists',
    rateLimited: 'Too many registration attempts. Please try again in an hour.',
    success: 'Registration successful. Check your email to confirm your account.',
    serverError: 'A server error occurred. Please try again later.',
  },
  uk: {
    emailRequired: 'Email обов\'язковий',
    passwordRequired: 'Пароль обов\'язковий',
    passwordConfirmRequired: 'Підтвердження пароля обов\'язкове',
    passwordMismatch: 'Паролі не збігаються',
    consentRequired: 'Ви повинні прийняти умови та політику конфіденційності',
    ageRequired: 'Ви повинні підтвердити, що вам щонайменше 16 років',
    emailExists: 'Акаунт з цією електронною адресою вже існує',
    rateLimited: 'Забагато спроб реєстрації. Спробуйте ще раз через годину.',
    success: 'Реєстрація успішна. Перевірте свою електронну пошту, щоб підтвердити акаунт.',
    serverError: 'Виникла помилка сервера. Спробуйте пізніше.',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      passwordConfirm,
      termsAccepted,
      ageConfirmed,
      language = 'pl',
    } = body as {
      email?: string;
      password?: string;
      passwordConfirm?: string;
      termsAccepted?: boolean;
      ageConfirmed?: boolean;
      language?: Language;
    };

    const t = messages[language] || messages.pl;

    // Basic validation
    if (!email?.trim()) {
      return NextResponse.json({ error: t.emailRequired }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: t.passwordRequired }, { status: 400 });
    }

    if (!passwordConfirm) {
      return NextResponse.json(
        { error: t.passwordConfirmRequired },
        { status: 400 }
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json({ error: t.passwordMismatch }, { status: 400 });
    }

    if (!termsAccepted) {
      return NextResponse.json({ error: t.consentRequired }, { status: 400 });
    }

    if (!ageConfirmed) {
      return NextResponse.json({ error: t.ageRequired }, { status: 400 });
    }

    // Password strength validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      const errorMessages = passwordValidation.errors.map((err) => {
        const msgs: Record<string, Record<Language, string>> = {
          min_length_8: {
            pl: 'Hasło musi mieć co najmniej 8 znaków',
            en: 'Password must be at least 8 characters',
            uk: 'Пароль має містити щонайменше 8 символів',
          },
          requires_letter: {
            pl: 'Hasło musi zawierać co najmniej jedną literę',
            en: 'Password must contain at least one letter',
            uk: 'Пароль має містити щонайменше одну літеру',
          },
          requires_number: {
            pl: 'Hasło musi zawierać co najmniej jedną cyfrę',
            en: 'Password must contain at least one number',
            uk: 'Пароль має містити щонайменше одну цифру',
          },
        };
        return msgs[err]?.[language] || msgs[err]?.pl || err;
      });
      return NextResponse.json(
        { error: errorMessages.join('. ') },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limiting (3 registrations per hour per IP)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `register:${ip}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, { limit: 3, windowMs: 60 * 60 * 1000 });
    if (!rateLimitResult.ok) {
      return NextResponse.json({ error: t.rateLimited }, { status: 429 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: t.emailExists }, { status: 409 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: passwordHash,
        emailVerified: null,
        onboardingComplete: false,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        ageConfirmedAt: new Date(),
        consentVersion: '1.0',
      },
    });

    // Generate verification token
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
    try {
      await sendVerificationEmail({
        email: normalizedEmail,
        token: verificationToken,
        language,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails - user can request resend
    }

    // Notify admins about new user
    try {
      await sendNewUserNotification({
        userEmail: normalizedEmail,
        userId: user.id,
      });
    } catch (notifyError) {
      console.error('Failed to notify admins:', notifyError);
    }

    return NextResponse.json({ message: t.success, userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: messages.pl.serverError },
      { status: 500 }
    );
  }
}
