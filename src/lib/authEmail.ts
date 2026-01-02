import { sendEmail } from './email';

type Language = 'pl' | 'en' | 'uk';

const getBaseUrl = () =>
  process.env.NEXTAUTH_URL || 'http://localhost:3000';

const emailTemplates = {
  verifyEmail: {
    pl: {
      subject: 'Potwierdź swój adres email - Henio',
      heading: 'Witaj w Henio!',
      intro: 'Dziękujemy za rejestrację. Kliknij przycisk poniżej, aby potwierdzić swój adres email:',
      button: 'Potwierdź email',
      expiry: 'Link jest ważny przez 24 godziny.',
      ignore: 'Jeśli nie rejestrowałeś się w Henio, zignoruj tę wiadomość.',
    },
    en: {
      subject: 'Confirm your email - Henio',
      heading: 'Welcome to Henio!',
      intro: 'Thanks for signing up. Click the button below to confirm your email address:',
      button: 'Confirm email',
      expiry: 'This link is valid for 24 hours.',
      ignore: "If you didn't sign up for Henio, please ignore this email.",
    },
    uk: {
      subject: 'Підтвердіть свою електронну пошту - Henio',
      heading: 'Ласкаво просимо до Henio!',
      intro: 'Дякуємо за реєстрацію. Натисніть кнопку нижче, щоб підтвердити свою електронну адресу:',
      button: 'Підтвердити email',
      expiry: 'Посилання дійсне протягом 24 годин.',
      ignore: 'Якщо ви не реєструвалися в Henio, проігноруйте цей лист.',
    },
  },
  resetPassword: {
    pl: {
      subject: 'Reset hasła - Henio',
      heading: 'Reset hasła',
      intro: 'Otrzymaliśmy prośbę o reset hasła dla Twojego konta. Kliknij przycisk poniżej:',
      button: 'Ustaw nowe hasło',
      expiry: 'Link jest ważny przez 1 godzinę.',
      ignore: 'Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość. Twoje hasło nie zostanie zmienione.',
    },
    en: {
      subject: 'Password reset - Henio',
      heading: 'Password reset',
      intro: 'We received a request to reset your password. Click the button below:',
      button: 'Set new password',
      expiry: 'This link is valid for 1 hour.',
      ignore: "If you didn't request a password reset, please ignore this email. Your password won't be changed.",
    },
    uk: {
      subject: 'Скидання пароля - Henio',
      heading: 'Скидання пароля',
      intro: 'Ми отримали запит на скидання пароля для вашого акаунту. Натисніть кнопку нижче:',
      button: 'Встановити новий пароль',
      expiry: 'Посилання дійсне протягом 1 години.',
      ignore: 'Якщо ви не запитували скидання пароля, проігноруйте цей лист. Ваш пароль не буде змінено.',
    },
  },
  passwordChanged: {
    pl: {
      subject: 'Hasło zostało zmienione - Henio',
      heading: 'Hasło zmienione',
      intro: 'Twoje hasło do konta Henio zostało pomyślnie zmienione.',
      warning: 'Jeśli to nie Ty zmieniłeś hasło, natychmiast skontaktuj się z nami.',
    },
    en: {
      subject: 'Password changed - Henio',
      heading: 'Password changed',
      intro: 'Your Henio account password has been successfully changed.',
      warning: "If you didn't make this change, please contact us immediately.",
    },
    uk: {
      subject: 'Пароль змінено - Henio',
      heading: 'Пароль змінено',
      intro: 'Пароль вашого акаунту Henio було успішно змінено.',
      warning: 'Якщо ви не змінювали пароль, негайно зв\'яжіться з нами.',
    },
  },
};

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Henio</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:linear-gradient(135deg,#8b5cf6,#3b82f6,#ec4899);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Henio</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#6b7280;font-size:12px;">
                &copy; ${new Date().getFullYear()} Henio. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const buttonStyle = `
  display:inline-block;
  background:linear-gradient(135deg,#8b5cf6,#3b82f6);
  color:#ffffff;
  text-decoration:none;
  padding:14px 32px;
  border-radius:12px;
  font-weight:600;
  font-size:16px;
  margin:24px 0;
`;

export async function sendVerificationEmail({
  email,
  token,
  language = 'pl',
}: {
  email: string;
  token: string;
  language?: Language;
}) {
  const t = emailTemplates.verifyEmail[language];
  const verifyUrl = `${getBaseUrl()}/api/auth/verify-email?token=${token}`;

  const html = emailWrapper(`
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:24px;">${t.heading}</h2>
    <p style="margin:0 0 8px;color:#4b5563;font-size:16px;line-height:1.6;">${t.intro}</p>
    <div style="text-align:center;">
      <a href="${verifyUrl}" style="${buttonStyle}">${t.button}</a>
    </div>
    <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">${t.expiry}</p>
    <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">${t.ignore}</p>
  `);

  const text = `${t.heading}\n\n${t.intro}\n\n${verifyUrl}\n\n${t.expiry}\n\n${t.ignore}`;

  await sendEmail({
    to: email,
    subject: t.subject,
    html,
    text,
  });
}

export async function sendPasswordResetEmail({
  email,
  token,
  language = 'pl',
}: {
  email: string;
  token: string;
  language?: Language;
}) {
  const t = emailTemplates.resetPassword[language];
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;

  const html = emailWrapper(`
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:24px;">${t.heading}</h2>
    <p style="margin:0 0 8px;color:#4b5563;font-size:16px;line-height:1.6;">${t.intro}</p>
    <div style="text-align:center;">
      <a href="${resetUrl}" style="${buttonStyle}">${t.button}</a>
    </div>
    <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">${t.expiry}</p>
    <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">${t.ignore}</p>
  `);

  const text = `${t.heading}\n\n${t.intro}\n\n${resetUrl}\n\n${t.expiry}\n\n${t.ignore}`;

  await sendEmail({
    to: email,
    subject: t.subject,
    html,
    text,
  });
}

export async function sendPasswordChangedNotification({
  email,
  language = 'pl',
}: {
  email: string;
  language?: Language;
}) {
  const t = emailTemplates.passwordChanged[language];

  const html = emailWrapper(`
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:24px;">${t.heading}</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.6;">${t.intro}</p>
    <p style="margin:0;padding:16px;background-color:#fef2f2;border-radius:8px;color:#991b1b;font-size:14px;">${t.warning}</p>
  `);

  const text = `${t.heading}\n\n${t.intro}\n\n${t.warning}`;

  await sendEmail({
    to: email,
    subject: t.subject,
    html,
    text,
  });
}
