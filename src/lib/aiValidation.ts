import type { FeedbackLanguage, NativeLanguage, TargetLanguage } from '@/types';

const TARGET_LANGUAGES = ['en', 'pl', 'de'] as const;
const NATIVE_LANGUAGES = ['pl', 'de', 'uk'] as const;
const FEEDBACK_LANGUAGES = ['pl', 'en', 'de', 'uk'] as const;

const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' && allowed.includes(value as T);

export const normalizeTargetLanguage = (
  value: unknown,
  fallback: TargetLanguage = 'en'
): TargetLanguage => (isOneOf(value, TARGET_LANGUAGES) ? value : fallback);

export const normalizeNativeLanguage = (
  value: unknown,
  fallback: NativeLanguage = 'pl'
): NativeLanguage => (isOneOf(value, NATIVE_LANGUAGES) ? value : fallback);

export const normalizeFeedbackLanguage = (
  value: unknown,
  fallback: FeedbackLanguage
): FeedbackLanguage => (isOneOf(value, FEEDBACK_LANGUAGES) ? value : fallback);
