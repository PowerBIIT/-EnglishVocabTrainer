import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '@/lib/email';
import {
  sendWaitlistApprovedEmail,
  sendWaitlistConfirmationEmail,
  sendWaitlistAdminNotification,
} from '@/lib/waitlistEmail';

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

describe('waitlist email helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.mocked(sendEmail).mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds confirmation email with base URL and fallback language', async () => {
    process.env.NEXTAUTH_URL = 'https://example.com/';

    await sendWaitlistConfirmationEmail({
      email: 'user@example.com',
      token: 'token-123',
      language: 'fr',
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(sendEmail).mock.calls[0][0];
    expect(payload.subject).toBe('Confirm your waitlist signup');
    expect(payload.html).toContain('https://example.com/api/waitlist/confirm?token=token-123');
    expect(payload.text).toContain('https://example.com/api/waitlist/confirm?token=token-123');
  });

  it('builds approved email with localized subject and login link', async () => {
    process.env.NEXTAUTH_URL = 'https://henio.app';

    await sendWaitlistApprovedEmail({ email: 'user@example.com', language: 'pl' });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(sendEmail).mock.calls[0][0];
    expect(payload.subject).toBe('Masz dostęp do Henio');
    expect(payload.html).toContain('https://henio.app/login');
    expect(payload.text).toContain('https://henio.app/login');
  });

  describe('sendWaitlistAdminNotification', () => {
    it('sends notification to admin emails with user details', async () => {
      process.env.NEXTAUTH_URL = 'https://henio.app';
      process.env.ADMIN_EMAILS = 'admin@example.com, admin2@example.com';

      await sendWaitlistAdminNotification({
        userEmail: 'new-user@example.com',
        source: 'landing-page',
        language: 'pl',
      });

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const payload = vi.mocked(sendEmail).mock.calls[0][0];
      expect(payload.to).toEqual(['admin@example.com', 'admin2@example.com']);
      expect(payload.subject).toBe('Nowy zapis na waitlist - Henio');
      expect(payload.html).toContain('new-user@example.com');
      expect(payload.html).toContain('landing-page');
      expect(payload.html).toContain('pl');
      expect(payload.html).toContain('https://henio.app/admin');
    });

    it('does not send email when ADMIN_EMAILS is empty', async () => {
      process.env.ADMIN_EMAILS = '';

      await sendWaitlistAdminNotification({
        userEmail: 'new-user@example.com',
      });

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('does not send email when ADMIN_EMAILS is undefined', async () => {
      delete process.env.ADMIN_EMAILS;

      await sendWaitlistAdminNotification({
        userEmail: 'new-user@example.com',
      });

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('handles missing optional fields', async () => {
      process.env.NEXTAUTH_URL = 'https://henio.app';
      process.env.ADMIN_EMAILS = 'admin@example.com';

      await sendWaitlistAdminNotification({
        userEmail: 'new-user@example.com',
      });

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const payload = vi.mocked(sendEmail).mock.calls[0][0];
      expect(payload.html).toContain('new-user@example.com');
      expect(payload.html).not.toContain('Źródło');
      expect(payload.html).not.toContain('Język');
    });
  });
});
