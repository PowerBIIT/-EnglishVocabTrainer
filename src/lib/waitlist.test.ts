import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';
import { AccessStatus } from '@prisma/client';
import { getAdminEmails, getMaxActiveUsers } from '@/lib/access';
import { sendWaitlistApprovedEmail } from '@/lib/waitlistEmail';

vi.mock('@/lib/access', () => ({
  getAdminEmails: vi.fn(),
  getMaxActiveUsers: vi.fn(),
}));

vi.mock('@/lib/waitlistEmail', () => ({
  sendWaitlistApprovedEmail: vi.fn(),
}));

type WaitlistEntryRecord = {
  id: string;
  email: string;
  status: 'PENDING' | 'CONFIRMED' | 'APPROVED' | 'DECLINED';
  confirmationTokenHash: string | null;
  confirmationExpiresAt: Date | null;
  confirmationSentAt: Date | null;
  confirmedAt: Date | null;
  approvedAt: Date | null;
  source: string | null;
  language: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

const waitlistEntries: WaitlistEntryRecord[] = [];

const seedEntry = (overrides: Partial<WaitlistEntryRecord> & { email: string }) => {
  const now = new Date();
  const entry: WaitlistEntryRecord = {
    id: overrides.id ?? `entry-${waitlistEntries.length + 1}`,
    email: overrides.email,
    status: overrides.status ?? 'PENDING',
    confirmationTokenHash: overrides.confirmationTokenHash ?? null,
    confirmationExpiresAt: overrides.confirmationExpiresAt ?? null,
    confirmationSentAt: overrides.confirmationSentAt ?? null,
    confirmedAt: overrides.confirmedAt ?? null,
    approvedAt: overrides.approvedAt ?? null,
    source: overrides.source ?? null,
    language: overrides.language ?? null,
    metadata: overrides.metadata ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
  waitlistEntries.push(entry);
  return entry;
};

let activeUserCount = 0;

const prismaMock = {
  waitlistEntry: {
    findUnique: vi.fn(async ({ where }: { where: { email: string } }) => {
      return waitlistEntries.find((entry) => entry.email === where.email) ?? null;
    }),
    findFirst: vi.fn(
      async ({ where }: { where: { confirmationTokenHash: string } }) => {
        return (
          waitlistEntries.find(
            (entry) => entry.confirmationTokenHash === where.confirmationTokenHash
          ) ?? null
        );
      }
    ),
    create: vi.fn(async ({ data }: { data: Partial<WaitlistEntryRecord> }) => {
      return seedEntry({
        email: data.email ?? 'unknown@example.com',
        status: (data.status as WaitlistEntryRecord['status']) ?? 'PENDING',
        confirmationTokenHash: (data.confirmationTokenHash as string) ?? null,
        confirmationExpiresAt: (data.confirmationExpiresAt as Date) ?? null,
        confirmationSentAt: (data.confirmationSentAt as Date) ?? null,
        source: (data.source as string) ?? null,
        language: (data.language as string) ?? null,
        metadata: (data.metadata as Record<string, unknown>) ?? null,
      });
    }),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<WaitlistEntryRecord>;
      }) => {
        const entry = waitlistEntries.find((item) => item.id === where.id);
        if (!entry) {
          throw new Error('Entry not found');
        }
        Object.assign(entry, data, { updatedAt: new Date() });
        return entry;
      }
    ),
    findMany: vi.fn(
      async ({
        where,
        take,
      }: {
        where: { status?: WaitlistEntryRecord['status'] };
        orderBy?: unknown;
        take?: number;
      }) => {
        const filtered = waitlistEntries.filter(
          (entry) => !where.status || entry.status === where.status
        );
        const sorted = filtered.sort((a, b) => {
          const aTime = a.confirmedAt?.getTime() ?? a.createdAt.getTime();
          const bTime = b.confirmedAt?.getTime() ?? b.createdAt.getTime();
          if (aTime !== bTime) return aTime - bTime;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
        return typeof take === 'number' ? sorted.slice(0, take) : sorted;
      }
    ),
    updateMany: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id?: { in: string[] }; status?: WaitlistEntryRecord['status'] };
        data: Partial<WaitlistEntryRecord>;
      }) => {
        let count = 0;
        waitlistEntries.forEach((entry) => {
          const matchesId =
            !where.id?.in || where.id.in.includes(entry.id);
          const matchesStatus = !where.status || entry.status === where.status;
          if (matchesId && matchesStatus) {
            Object.assign(entry, data, { updatedAt: new Date() });
            count += 1;
          }
        });
        return { count };
      }
    ),
  },
  userPlan: {
    count: vi.fn(async () => activeUserCount),
    updateMany: vi.fn(async () => ({ count: 0 })),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

const loadWaitlist = async () => {
  vi.resetModules();
  return import('@/lib/waitlist');
};

describe('waitlist flows', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    waitlistEntries.length = 0;
    activeUserCount = 0;
    vi.mocked(getAdminEmails).mockReturnValue([]);
    vi.mocked(getMaxActiveUsers).mockResolvedValue(Number.POSITIVE_INFINITY);
    vi.mocked(sendWaitlistApprovedEmail).mockResolvedValue();
    prismaMock.waitlistEntry.findUnique.mockClear();
    prismaMock.waitlistEntry.findFirst.mockClear();
    prismaMock.waitlistEntry.create.mockClear();
    prismaMock.waitlistEntry.update.mockClear();
    prismaMock.waitlistEntry.findMany.mockClear();
    prismaMock.waitlistEntry.updateMany.mockClear();
    prismaMock.userPlan.count.mockClear();
    prismaMock.userPlan.updateMany.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('creates a new waitlist entry and returns token', async () => {
    process.env.WAITLIST_CONFIRM_TTL_HOURS = '24';
    process.env.WAITLIST_CONFIRM_RESEND_MINUTES = '10';

    const { createWaitlistEntry } = await loadWaitlist();
    const result = await createWaitlistEntry({
      email: 'Test@Example.com',
      source: 'test',
    });

    expect(result.status).toBe('pending');
    expect(result.token).toEqual(expect.any(String));
    expect(result.shouldSendConfirmation).toBe(true);
    expect(waitlistEntries[0].email).toBe('test@example.com');
    expect(waitlistEntries[0].confirmationTokenHash).toEqual(expect.any(String));
  });

  it('returns approved when entry is already approved', async () => {
    seedEntry({ email: 'user@example.com', status: 'APPROVED' });
    const { createWaitlistEntry } = await loadWaitlist();

    const result = await createWaitlistEntry({ email: 'user@example.com' });

    expect(result.status).toBe('approved');
    expect(result.shouldSendConfirmation).toBe(false);
  });

  it('returns confirmed when entry is already confirmed', async () => {
    seedEntry({ email: 'user@example.com', status: 'CONFIRMED' });
    const { createWaitlistEntry } = await loadWaitlist();

    const result = await createWaitlistEntry({ email: 'user@example.com' });

    expect(result.status).toBe('confirmed');
    expect(result.shouldSendConfirmation).toBe(false);
  });

  it('throttles confirmation resend inside cooldown window', async () => {
    const now = new Date();
    seedEntry({
      email: 'user@example.com',
      status: 'PENDING',
      confirmationSentAt: now,
    });

    process.env.WAITLIST_CONFIRM_TTL_HOURS = '24';
    process.env.WAITLIST_CONFIRM_RESEND_MINUTES = '10';

    const { createWaitlistEntry } = await loadWaitlist();
    const result = await createWaitlistEntry({ email: 'user@example.com' });

    expect(result.status).toBe('pending');
    expect(result.shouldSendConfirmation).toBe(false);
    expect(result.token).toBeUndefined();
  });

  it('resends confirmation when cooldown passed', async () => {
    const past = new Date(Date.now() - 20 * 60 * 1000);
    seedEntry({
      email: 'user@example.com',
      status: 'PENDING',
      confirmationSentAt: past,
    });

    process.env.WAITLIST_CONFIRM_TTL_HOURS = '24';
    process.env.WAITLIST_CONFIRM_RESEND_MINUTES = '10';

    const { createWaitlistEntry } = await loadWaitlist();
    const result = await createWaitlistEntry({ email: 'user@example.com' });

    expect(result.status).toBe('pending');
    expect(result.shouldSendConfirmation).toBe(true);
    expect(result.token).toEqual(expect.any(String));
    expect(waitlistEntries[0].confirmationTokenHash).toEqual(expect.any(String));
  });

  it('returns invalid when token is unknown', async () => {
    const { confirmWaitlistToken } = await loadWaitlist();
    const result = await confirmWaitlistToken('missing-token');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid');
  });

  it('returns expired when token is past TTL', async () => {
    const token = 'expired-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    seedEntry({
      email: 'user@example.com',
      status: 'PENDING',
      confirmationTokenHash: tokenHash,
      confirmationExpiresAt: new Date(Date.now() - 1_000),
    });

    const { confirmWaitlistToken } = await loadWaitlist();
    const result = await confirmWaitlistToken(token);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('returns approved when token already approved', async () => {
    const token = 'approved-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    seedEntry({
      email: 'user@example.com',
      status: 'APPROVED',
      confirmationTokenHash: tokenHash,
      confirmationExpiresAt: new Date(Date.now() + 60_000),
    });

    const { confirmWaitlistToken } = await loadWaitlist();
    const result = await confirmWaitlistToken(token);

    expect(result.ok).toBe(true);
    expect(result.status).toBe('approved');
  });

  it('confirms a valid token and clears the hash', async () => {
    const { createWaitlistEntry, confirmWaitlistToken } = await loadWaitlist();
    const created = await createWaitlistEntry({ email: 'user@example.com' });
    const result = await confirmWaitlistToken(created.token ?? '');

    expect(result.ok).toBe(true);
    expect(result.status).toBe('confirmed');
    expect(waitlistEntries[0].status).toBe('CONFIRMED');
    expect(waitlistEntries[0].confirmationTokenHash).toBeNull();
  });

  it('returns no approvals when no slots are available', async () => {
    activeUserCount = 2;
    vi.mocked(getMaxActiveUsers).mockResolvedValue(2);

    const { autoApproveWaitlist } = await loadWaitlist();
    const result = await autoApproveWaitlist();

    expect(result).toEqual([]);
  });

  it('returns empty when no confirmed entries exist', async () => {
    activeUserCount = 0;
    vi.mocked(getMaxActiveUsers).mockResolvedValue(3);

    const { autoApproveWaitlist } = await loadWaitlist();
    const result = await autoApproveWaitlist();

    expect(result).toEqual([]);
  });

  it('auto-approves confirmed entries within available slots', async () => {
    vi.mocked(getMaxActiveUsers).mockResolvedValue(2);
    activeUserCount = 0;

    seedEntry({
      email: 'a@example.com',
      status: 'CONFIRMED',
      confirmedAt: new Date('2024-01-01T00:00:00Z'),
    });
    seedEntry({
      email: 'b@example.com',
      status: 'CONFIRMED',
      confirmedAt: new Date('2024-01-02T00:00:00Z'),
    });
    seedEntry({
      email: 'c@example.com',
      status: 'CONFIRMED',
      confirmedAt: new Date('2024-01-03T00:00:00Z'),
    });

    const { autoApproveWaitlist } = await loadWaitlist();
    const result = await autoApproveWaitlist();

    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.email)).toEqual([
      'a@example.com',
      'b@example.com',
    ]);
    expect(waitlistEntries[0].status).toBe('APPROVED');
    expect(waitlistEntries[1].status).toBe('APPROVED');
    expect(prismaMock.userPlan.updateMany).toHaveBeenCalledWith({
      where: {
        accessStatus: AccessStatus.WAITLISTED,
        user: { email: { in: ['a@example.com', 'b@example.com'] } },
      },
      data: { accessStatus: AccessStatus.ACTIVE },
    });
  });

  it('notifies approved users after auto-approval', async () => {
    vi.mocked(getMaxActiveUsers).mockResolvedValue(Number.POSITIVE_INFINITY);
    activeUserCount = 0;

    seedEntry({
      email: 'notify@example.com',
      status: 'CONFIRMED',
      confirmedAt: new Date('2024-02-01T00:00:00Z'),
    });

    const { autoApproveWaitlistAndNotify } = await loadWaitlist();
    const result = await autoApproveWaitlistAndNotify();

    expect(result).toHaveLength(1);
    expect(sendWaitlistApprovedEmail).toHaveBeenCalledWith({
      email: 'notify@example.com',
      language: null,
    });
  });
});
