const normalizeEmail = (email: string) => email.trim().toLowerCase();

const parseEmailList = (value?: string) => {
  if (!value) return new Set<string>();
  return new Set(
    value
      .split(/[\s,;]+/)
      .map((entry) => normalizeEmail(entry))
      .filter(Boolean)
  );
};

const allowlistEmails = parseEmailList(process.env.ALLOWLIST_EMAILS);
const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);

export const isAdminEmail = (email?: string | null) => {
  if (!email) return false;
  return adminEmails.has(normalizeEmail(email));
};

export const isEmailAllowed = (email?: string | null) => {
  if (allowlistEmails.size === 0) return true;
  if (!email) return false;
  if (isAdminEmail(email)) return true;
  return allowlistEmails.has(normalizeEmail(email));
};

export const getAllowlistEmails = () => Array.from(allowlistEmails).sort();
export const getAdminEmails = () => Array.from(adminEmails).sort();

export const getMaxActiveUsers = () => {
  const raw = process.env.MAX_ACTIVE_USERS?.trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  if (raw === '-1') return Number.POSITIVE_INFINITY;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor(parsed);
};
