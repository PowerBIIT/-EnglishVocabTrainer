import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  hashPassword,
  hashToken,
  validatePasswordStrength,
} from '@/lib/passwordAuth';
import { sendPasswordChangedNotification } from '@/lib/authEmail';

type Language = 'pl' | 'en' | 'uk';

const messages = {
  pl: {
    tokenRequired: 'Token jest wymagany',
    passwordRequired: 'Hasło jest wymagane',
    passwordConfirmRequired: 'Potwierdzenie hasła jest wymagane',
    passwordMismatch: 'Hasła nie są identyczne',
    invalidToken: 'Link do resetowania hasła jest nieprawidłowy lub wygasł',
    success: 'Hasło zostało zmienione. Możesz się teraz zalogować.',
    serverError: 'Wystąpił błąd serwera',
    passwordErrors: {
      min_length_8: 'Hasło musi mieć co najmniej 8 znaków',
      requires_letter: 'Hasło musi zawierać co najmniej jedną literę',
      requires_number: 'Hasło musi zawierać co najmniej jedną cyfrę',
    },
  },
  en: {
    tokenRequired: 'Token is required',
    passwordRequired: 'Password is required',
    passwordConfirmRequired: 'Password confirmation is required',
    passwordMismatch: 'Passwords do not match',
    invalidToken: 'The password reset link is invalid or has expired',
    success: 'Password has been changed. You can now sign in.',
    serverError: 'A server error occurred',
    passwordErrors: {
      min_length_8: 'Password must be at least 8 characters',
      requires_letter: 'Password must contain at least one letter',
      requires_number: 'Password must contain at least one number',
    },
  },
  uk: {
    tokenRequired: 'Токен обов\'язковий',
    passwordRequired: 'Пароль обов\'язковий',
    passwordConfirmRequired: 'Підтвердження пароля обов\'язкове',
    passwordMismatch: 'Паролі не збігаються',
    invalidToken: 'Посилання для скидання пароля недійсне або застаріле',
    success: 'Пароль змінено. Тепер можете увійти.',
    serverError: 'Виникла помилка сервера',
    passwordErrors: {
      min_length_8: 'Пароль має містити щонайменше 8 символів',
      requires_letter: 'Пароль має містити щонайменше одну літеру',
      requires_number: 'Пароль має містити щонайменше одну цифру',
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, passwordConfirm, language = 'pl' } = body as {
      token?: string;
      password?: string;
      passwordConfirm?: string;
      language?: Language;
    };

    const t = messages[language] || messages.pl;

    // Validation
    if (!token) {
      return NextResponse.json({ error: t.tokenRequired }, { status: 400 });
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

    // Password strength validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      const errorMessages = passwordValidation.errors.map(
        (err) => t.passwordErrors[err]
      );
      return NextResponse.json(
        { error: errorMessages.join('. ') },
        { status: 400 }
      );
    }

    // Find user by reset token
    const hashedToken = hashToken(token);
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json({ error: t.invalidToken }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Send notification email
    try {
      await sendPasswordChangedNotification({
        email: user.email!,
        language,
      });
    } catch (emailError) {
      console.error('Failed to send password changed notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ message: t.success });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: messages.pl.serverError },
      { status: 500 }
    );
  }
}
