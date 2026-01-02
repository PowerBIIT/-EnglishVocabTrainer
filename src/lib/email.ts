import nodemailer from 'nodemailer';

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const replyTo = process.env.SMTP_REPLY_TO?.trim();

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP configuration is incomplete (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM required)');
  }

  return { host, port, user, pass, from, replyTo };
};

const createTransporter = () => {
  const { host, port, user, pass } = getSmtpConfig();

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export const sendEmail = async ({ to, subject, html, text }: EmailPayload) => {
  const { from, replyTo } = getSmtpConfig();
  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
};
