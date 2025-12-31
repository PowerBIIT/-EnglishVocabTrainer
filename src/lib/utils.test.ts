import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  BADGES,
  XP_ACTIONS,
  cn,
  formatDate,
  formatTime,
  generateId,
  getDistractors,
  getLevelProgress,
  levelThresholds,
  shuffleArray,
  speak,
} from '@/lib/utils';
import { estimateMonthlyCost, projectMonthlyCost } from '@/lib/costEstimation';

describe('utility helpers', () => {
  const originalSpeech = (window as Window & { speechSynthesis?: unknown }).speechSynthesis;
  const originalUtterance = (window as Window & { SpeechSynthesisUtterance?: unknown })
    .SpeechSynthesisUtterance;
  const originalMathRandom = Math.random;
  const originalDateNow = Date.now;

  beforeEach(() => {
    Math.random = originalMathRandom;
    Date.now = originalDateNow;
  });

  afterEach(() => {
    Math.random = originalMathRandom;
    Date.now = originalDateNow;
    (window as Window & { speechSynthesis?: unknown }).speechSynthesis = originalSpeech;
    (window as Window & { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance =
      originalUtterance;
  });

  it('combines class names', () => {
    expect(cn('a', { b: true, c: false })).toBe('a b');
  });

  it('shuffles arrays without losing items', () => {
    Math.random = () => 0.5;
    const input = [1, 2, 3, 4];
    const output = shuffleArray(input);
    expect(output).toHaveLength(4);
    expect(output).toEqual(expect.arrayContaining(input));
    expect(output).not.toBe(input);
  });

  it('generates a deterministic id from time and random', () => {
    Date.now = () => 1234567890;
    Math.random = () => 0.123456789;
    const id = generateId();
    expect(id).toMatch(/^1234567890-[a-z0-9]+$/);
  });

  it('formats dates and times', () => {
    const date = new Date(Date.UTC(2024, 0, 1));
    expect(formatDate(date, 'en-US')).toContain('2024');
    expect(formatTime(125)).toBe('2:05');
  });

  it('calculates level progress', () => {
    expect(getLevelProgress(0).level).toBe(1);
    expect(getLevelProgress(100).level).toBe(2);
  });

  it('uses the fallback next level threshold for max levels', () => {
    const lastThreshold = levelThresholds[levelThresholds.length - 1];
    const result = getLevelProgress(lastThreshold + 5000);
    expect(result.nextLevelXp).toBe(1000);
  });

  it('creates distractors excluding the correct answer', () => {
    Math.random = () => 0.8;
    const distractors = getDistractors('a', ['a', 'b', 'c', 'd'], 2);
    expect(distractors).toHaveLength(2);
    expect(distractors).not.toContain('a');
  });

  it('exposes XP actions and badges', () => {
    expect(XP_ACTIONS.correct_answer).toBeGreaterThan(0);
    expect(BADGES.streak_7.id).toBe('streak_7');
  });

  it('estimates monthly costs', () => {
    const cost = estimateMonthlyCost(120000);
    expect(cost).toBeGreaterThan(0);

    const projected = projectMonthlyCost(120000, new Date(Date.UTC(2024, 0, 15)));
    expect(projected).toBeGreaterThan(cost);
  });

  it('speaks when speech synthesis is available', async () => {
    const utterances: Array<{ onend?: () => void; onerror?: (e: unknown) => void }> = [];

    (window as Window & { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance =
      class {
        text: string;
        rate = 1;
        lang = '';
        voice?: { lang: string };
        onend?: () => void;
        onerror?: (e: unknown) => void;
        constructor(text: string) {
          this.text = text;
          utterances.push(this);
        }
      };

    (window as Window & { speechSynthesis?: unknown }).speechSynthesis = {
      getVoices: () => [{ lang: 'en-GB' }],
      speak: (utterance: { onend?: () => void }) => utterance.onend?.(),
    };

    await expect(speak('hello', { voice: 'british' })).resolves.toBeUndefined();
    await expect(speak('hi', { voice: 'australian' })).resolves.toBeUndefined();

    expect(utterances).toHaveLength(2);
    expect((utterances[1] as { lang?: string }).lang).toBe('en-AU');
  });

  it('rejects when speech synthesis is unavailable', async () => {
    delete (window as Window & { speechSynthesis?: unknown }).speechSynthesis;

    await expect(speak('hello')).rejects.toThrow('Speech synthesis not supported');
  });
});
