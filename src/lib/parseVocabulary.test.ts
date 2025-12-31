import { describe, expect, it } from 'vitest';
import { parseVocabularyInput } from '@/lib/parseVocabulary';

describe('parseVocabularyInput', () => {
  it('parses pairs separated by commas or newlines', () => {
    const input = 'apple - jabłko, pear - gruszka\nplum = śliwka';
    const result = parseVocabularyInput(input);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ target: 'apple', native: 'jabłko' });
    expect(result[1]).toMatchObject({ target: 'pear', native: 'gruszka' });
    expect(result[2]).toMatchObject({ target: 'plum', native: 'śliwka' });
  });

  it('ignores invalid rows', () => {
    const input = 'hello world\n- brak\nok - ok';
    const result = parseVocabularyInput(input);

    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('ok');
  });

  it('adds phonetics and difficulty defaults', () => {
    const input = 'Train - pociag';
    const result = parseVocabularyInput(input);

    expect(result[0]).toMatchObject({
      target: 'Train',
      native: 'pociag',
      phonetic: '/train/',
      difficulty: 'medium',
    });
  });

  it('skips entries that are too short', () => {
    const input = 'a - b, ok - good';
    const result = parseVocabularyInput(input);

    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('ok');
  });
});
