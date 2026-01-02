import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 12;
const TOKEN_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: PasswordError[];
}

export type PasswordError =
  | 'min_length_8'
  | 'requires_letter'
  | 'requires_number';

export function validatePasswordStrength(
  password: string
): PasswordValidationResult {
  const errors: PasswordError[] = [];

  if (password.length < 8) {
    errors.push('min_length_8');
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('requires_letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('requires_number');
  }

  return { valid: errors.length === 0, errors };
}

export const PASSWORD_ERROR_MESSAGES: Record<
  PasswordError,
  { pl: string; en: string; uk: string }
> = {
  min_length_8: {
    pl: 'Hasło musi mieć co najmniej 8 znaków',
    en: 'Password must be at least 8 characters',
    uk: 'Пароль має містити щонайменше 8 символів',
  },
  requires_letter: {
    pl: 'Hasło musi zawierać co najmniej jedną literę',
    en: 'Password must contain at least one letter',
    uk: 'Пароль має містити щонайменше одну літеру',
  },
  requires_number: {
    pl: 'Hasło musi zawierać co najmniej jedną cyfrę',
    en: 'Password must contain at least one number',
    uk: 'Пароль має містити щонайменше одну цифру',
  },
};

export function getPasswordErrorMessage(
  error: PasswordError,
  language: 'pl' | 'en' | 'uk' = 'pl'
): string {
  return PASSWORD_ERROR_MESSAGES[error][language];
}

export const EMAIL_VERIFY_TTL_HOURS = 24;
export const PASSWORD_RESET_TTL_HOURS = 1;

export function getEmailVerifyExpiry(): Date {
  return new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000);
}

export function getPasswordResetExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000);
}
