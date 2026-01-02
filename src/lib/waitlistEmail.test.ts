import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '@/lib/email';
import {
  sendWaitlistApprovedEmail,
  sendWaitlistConfirmationEmail,
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
});
