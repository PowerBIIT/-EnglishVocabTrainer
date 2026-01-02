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

export const isEmailAllowed = async (email?: string | null) => {
  const allowlist = await getAllowlistEmails();
  if (allowlist.length === 0) return true;
  if (!email) return false;
  if (isAdminEmail(email)) return true;
  const normalized = normalizeEmail(email);
  if (allowlist.includes(normalized)) return true;

  const approved = await prisma.waitlistEntry.findFirst({
    where: { email: normalized, status: 'APPROVED' },
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
