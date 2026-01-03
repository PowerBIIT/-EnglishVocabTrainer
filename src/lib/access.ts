import { getAppConfig, getAppConfigNumber } from '@/lib/config';
import { prisma } from '@/lib/db';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const parseEmailList = (value?: string | null) => {
  if (!value) return new Set<string>();
  return new Set(
    value
      .split(/[\s,;]+/)
      .map((entry) => normalizeEmail(entry))
      .filter(Boolean)
  );
};

const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);

export const isAdminEmail = (email?: string | null) => {
  if (!email) return false;
  return adminEmails.has(normalizeEmail(email));
};

/**
 * Check if email is on the VIP allowlist (bypasses MAX_ACTIVE_USERS limit).
 * Does NOT block users - just gives them priority access.
 */
export const isOnAllowlist = async (email?: string | null) => {
  if (!email) return false;
  const allowlist = await getAllowlistEmails();
  if (allowlist.length === 0) return false;
  return allowlist.includes(normalizeEmail(email));
};

/**
 * Check if user has been approved via waitlist.
 */
export const isWaitlistApproved = async (email?: string | null) => {
  if (!email) return false;
  const approved = await prisma.waitlistEntry.findFirst({
    where: { email: normalizeEmail(email), status: 'APPROVED' },
    select: { id: true },
  });
  return Boolean(approved);
};

export const getAllowlistEmails = async () => {
  const raw = await getAppConfig('ALLOWLIST_EMAILS');
  return Array.from(parseEmailList(raw)).sort();
};
export const getAdminEmails = () => Array.from(adminEmails).sort();

export const getMaxActiveUsers = async () => {
  const parsed = await getAppConfigNumber('MAX_ACTIVE_USERS', Number.POSITIVE_INFINITY);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor(parsed);
};
