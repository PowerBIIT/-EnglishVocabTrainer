import { describe, expect, it } from 'vitest';
import {
  normalizeFeedbackLanguage,
  normalizeNativeLanguage,
  normalizeTargetLanguage,
} from '@/lib/aiValidation';

describe('ai language normalization', () => {
  it('accepts supported language codes', () => {
    expect(normalizeTargetLanguage('en')).toBe('en');
    expect(normalizeNativeLanguage('de')).toBe('de');
    expect(normalizeFeedbackLanguage('uk', 'pl')).toBe('uk');
  });

  it('falls back to defaults when unsupported', () => {
    expect(normalizeTargetLanguage('es', 'de')).toBe('de');
    expect(normalizeNativeLanguage(undefined, 'pl')).toBe('pl');
    expect(normalizeFeedbackLanguage('xx', 'en')).toBe('en');
  });
});
