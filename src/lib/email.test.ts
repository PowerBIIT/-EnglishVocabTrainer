import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

import nodemailer from 'nodemailer';
import { sendEmail } from '@/lib/email';

describe('sendEmail', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('throws when config is missing', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;

    await expect(
      sendEmail({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' })
    ).rejects.toThrow('SMTP configuration is incomplete');
  });

  it('sends email via SMTP with reply-to', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'secret';
    process.env.SMTP_FROM = 'Henio <hello@henio.app>';
    process.env.SMTP_REPLY_TO = 'support@henio.app';

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: mockSendMail,
    } as ReturnType<typeof nodemailer.createTransport>);

    await sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'test@example.com',
        pass: 'secret',
      },
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'Henio <hello@henio.app>',
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
      replyTo: 'support@henio.app',
    });
  });

  it('sends email to multiple recipients', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'secret';
    process.env.SMTP_FROM = 'Henio <hello@henio.app>';

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: mockSendMail,
    } as ReturnType<typeof nodemailer.createTransport>);

    await sendEmail({
      to: ['user1@example.com', 'user2@example.com'],
      subject: 'Hello',
      html: '<p>Hello</p>',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user1@example.com, user2@example.com',
      })
    );
  });
});
