import { describe, expect, it } from 'vitest';
import { calculatePronunciationScore, normalizePronunciationText } from '@/lib/pronunciation';

describe('pronunciation helpers', () => {
  it('normalizes text and strips English articles when configured', () => {
    expect(normalizePronunciationText('The Apple', { language: 'en' })).toBe('apple');
    expect(normalizePronunciationText('Caf\u00e9')).toBe('cafe');
  });

  it('allows keeping articles when configured', () => {
    expect(normalizePronunciationText('The Apple', { stripArticles: false })).toBe('the apple');
  });

  it('calculates a perfect score for matching inputs', () => {
    const result = calculatePronunciationScore('apple', 'apple');
    expect(result.score).toBe(10);
    expect(result.similarity).toBe(1);
  });

  it('handles empty inputs', () => {
    const result = calculatePronunciationScore('', '');
    expect(result.score).toBe(10);
  });

  it('handles empty expected or spoken values', () => {
    const result = calculatePronunciationScore('', 'word');
    expect(result.score).toBe(1);
  });

  it('calculates partial similarity for different inputs', () => {
    const result = calculatePronunciationScore('red apple', 'red pear');
    expect(result.score).toBeGreaterThan(1);
    expect(result.score).toBeLessThan(10);
  });

  it('handles longer spoken inputs', () => {
    const result = calculatePronunciationScore('a', 'alphabet');
    expect(result.score).toBe(1);
  });
});
