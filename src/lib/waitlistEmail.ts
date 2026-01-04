import { sendEmail } from '@/lib/email';

const SUPPORTED_LANGUAGES = new Set(['pl', 'en', 'uk']);

const normalizeLanguage = (language?: string | null) => {
  if (language && SUPPORTED_LANGUAGES.has(language)) {
    return language as 'pl' | 'en' | 'uk';
  }
  return 'en' as const;
};

const getBaseUrl = () => {
  const raw = process.env.NEXTAUTH_URL?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/$/, '') : 'http://localhost:3000';
};

const buildConfirmationContent = (language: 'pl' | 'en' | 'uk', confirmUrl: string) => {
  const copy = {
    pl: {
      subject: 'Potwierdź zapis na listę oczekujących',
      intro: 'Dziękujemy za zapis! Potwierdź swój adres e-mail, aby dołączyć do listy oczekujących.',
      cta: 'Potwierdzam zapis',
      outro: 'Jeśli to nie Ty, zignoruj tę wiadomość.',
    },
    en: {
      subject: 'Confirm your waitlist signup',
      intro: 'Thanks for signing up! Please confirm your email address to join the waitlist.',
      cta: 'Confirm signup',
      outro: "If you didn't request this, you can safely ignore this email.",
    },
    uk: {
      subject: 'Підтвердіть запис до списку очікування',
      intro: 'Дякуємо за запис! Підтвердіть свою електронну адресу, щоб приєднатися до списку.',
      cta: 'Підтвердити запис',
      outro: 'Якщо це були не ви, просто проігноруйте цей лист.',
    },
  }[language];

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 12px; font-size: 20px;">${copy.subject}</h2>
      <p style="margin: 0 0 16px;">${copy.intro}</p>
      <p style="margin: 0 0 24px;">
        <a href="${confirmUrl}" style="display: inline-block; padding: 12px 18px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px;">
          ${copy.cta}
        </a>
      </p>
      <p style="margin: 0; color: #475569; font-size: 14px;">${copy.outro}</p>
      <p style="margin: 16px 0 0; color: #475569; font-size: 12px;">${confirmUrl}</p>
    </div>
  `;

  const text = `${copy.intro}\n\n${copy.cta}: ${confirmUrl}\n\n${copy.outro}`;

  return { subject: copy.subject, html, text };
};

const buildApprovedContent = (language: 'pl' | 'en' | 'uk', loginUrl: string) => {
  const copy = {
    pl: {
      subject: 'Masz dostęp do Henio',
      intro: 'Twoje miejsce jest gotowe. Możesz już zalogować się do aplikacji.',
      cta: 'Zaloguj się',
    },
    en: {
      subject: 'Your access is ready',
      intro: 'A spot just opened up. You can now sign in to the app.',
      cta: 'Sign in',
    },
    uk: {
      subject: 'Ваш доступ готовий',
      intro: 'Зʼявилося місце. Тепер ви можете увійти до застосунку.',
      cta: 'Увійти',
    },
  }[language];

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 12px; font-size: 20px;">${copy.subject}</h2>
      <p style="margin: 0 0 16px;">${copy.intro}</p>
      <p style="margin: 0 0 24px;">
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 18px; background: #16a34a; color: #fff; text-decoration: none; border-radius: 8px;">
          ${copy.cta}
        </a>
      </p>
      <p style="margin: 0; color: #475569; font-size: 12px;">${loginUrl}</p>
    </div>
  `;

  const text = `${copy.intro}\n\n${copy.cta}: ${loginUrl}`;

  return { subject: copy.subject, html, text };
};

export const sendWaitlistConfirmationEmail = async ({
  email,
  token,
  language,
}: {
  email: string;
  token: string;
  language?: string | null;
}) => {
  const locale = normalizeLanguage(language);
  const confirmUrl = `${getBaseUrl()}/api/waitlist/confirm?token=${encodeURIComponent(token)}`;
  const content = buildConfirmationContent(locale, confirmUrl);
  await sendEmail({ to: email, ...content });
};

export const sendWaitlistApprovedEmail = async ({
  email,
  language,
}: {
  email: string;
  language?: string | null;
}) => {
  const locale = normalizeLanguage(language);
  const loginUrl = `${getBaseUrl()}/login`;
  const content = buildApprovedContent(locale, loginUrl);
  await sendEmail({ to: email, ...content });
};

export const sendWaitlistAdminNotification = async ({
  userEmail,
  source,
  language,
}: {
  userEmail: string;
  source?: string | null;
  language?: string | null;
}) => {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (!adminEmails || adminEmails.length === 0) {
    return;
  }

  const adminUrl = `${getBaseUrl()}/admin`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 12px; font-size: 20px;">Nowy zapis na waitlist</h2>
      <p style="margin: 0 0 16px;">Ktoś zapisał się na listę oczekujących w aplikacji Henio.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; color: #6b7280;">Email:</td>
          <td style="padding: 8px; font-weight: 500;">${userEmail}</td>
        </tr>
        ${source ? `<tr><td style="padding: 8px; color: #6b7280;">Źródło:</td><td style="padding: 8px;">${source}</td></tr>` : ''}
        ${language ? `<tr><td style="padding: 8px; color: #6b7280;">Język:</td><td style="padding: 8px;">${language}</td></tr>` : ''}
      </table>
      <p style="margin: 24px 0 0;">
        <a href="${adminUrl}" style="display: inline-block; padding: 12px 18px; background: #8b5cf6; color: #fff; text-decoration: none; border-radius: 8px;">
          Panel administracyjny
        </a>
      </p>
    </div>
  `;

  const text = `Nowy zapis na waitlist\n\nEmail: ${userEmail}${source ? `\nŹródło: ${source}` : ''}${language ? `\nJęzyk: ${language}` : ''}\n\nPanel: ${adminUrl}`;

  await sendEmail({
    to: adminEmails,
    subject: 'Nowy zapis na waitlist - Henio',
    html,
    text,
  });
};
