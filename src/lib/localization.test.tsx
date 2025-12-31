import { describe, expect, it, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { getCategoryLabel } from '@/lib/categories';
import {
  DEFAULT_PAIR_ID,
  buildPairId,
  getLanguageLabel,
  getLearningPair,
  getNativeText,
  getSpeechLocale,
  getTargetExample,
  getTargetText,
  normalizePairId,
} from '@/lib/languages';
import { getMissionCopy } from '@/lib/missions';
import { getPersonaForPair } from '@/lib/persona';
import { isAppLanguage, useLanguage } from '@/lib/i18n';
import { useVocabStore } from '@/lib/store';
import type { VocabularyItem } from '@/types';

const LanguageProbe = () => {
  const language = useLanguage();
  return <div data-testid="language">{language}</div>;
};

describe('localization helpers', () => {
  beforeEach(() => {
    useVocabStore.setState((state) => ({
      settings: {
        ...state.settings,
        general: {
          ...state.settings.general,
          language: 'en',
        },
      },
    }));
  });

  it('returns category labels per language', () => {
    expect(getCategoryLabel('Food', 'en')).toBe('Food');
    expect(getCategoryLabel('Food', 'pl')).toBe('Jedzenie');
    expect(getCategoryLabel('Food', 'uk')).not.toBe('Food');
  });

  it('handles learning pairs and labels', () => {
    expect(getLearningPair(DEFAULT_PAIR_ID).id).toBe(DEFAULT_PAIR_ID);
    expect(getLearningPair('unknown').id).toBe(DEFAULT_PAIR_ID);
    expect(getLearningPair('uk-en').id).toBe('uk-en');
    expect(buildPairId('pl', 'en')).toBe('pl-en');
    expect(normalizePairId('bad')).toBe(DEFAULT_PAIR_ID);
    expect(getLanguageLabel('pl', 'en')).toBe('Polish');
    expect(getLanguageLabel('pl', 'xx' as never)).toBe('PL');
  });

  it('resolves speech locales', () => {
    expect(getSpeechLocale('en', 'american')).toBe('en-US');
    expect(getSpeechLocale('en', 'australian')).toBe('en-AU');
    expect(getSpeechLocale('en')).toBe('en-GB');
    expect(getSpeechLocale('de')).toBe('de-DE');
  });

  it('extracts target/native fields', () => {
    const word: VocabularyItem = {
      id: 'v1',
      en: 'apple',
      pl: 'jablko',
      example_en: 'Example.',
      example_pl: 'Przyklad.',
      phonetic: '/apple/',
      category: 'Test',
      difficulty: 'easy',
      created_at: new Date(),
      source: 'manual',
      languagePair: 'pl-en',
    };

    expect(getTargetText(word)).toBe('apple');
    expect(getNativeText(word)).toBe('jablko');
    expect(getTargetExample(word)).toBe('Example.');
  });

  it('provides mission copy and persona mapping', () => {
    expect(getMissionCopy('en', 'quiz').title).toBe('Sharp Quiz');
    expect(getMissionCopy('xx' as never, 'flashcards').title).toBe('Szybki trening fiszek');
    expect(getPersonaForPair('pl-en')).toBe('pl_student');
    expect(getPersonaForPair('uk-pl')).toBe('ua_student');
    expect(getPersonaForPair('de-en')).toBe('general');
  });

  it('validates app language and exposes hook', () => {
    expect(isAppLanguage('en')).toBe(true);
    expect(isAppLanguage('es')).toBe(false);

    render(<LanguageProbe />);
    expect(screen.getByTestId('language').textContent).toBe('en');
  });

  it('falls back to the first pair when default lookup fails', async () => {
    vi.resetModules();
    const originalFind = Array.prototype.find;
    let firstCall = true;

    Array.prototype.find = function (...args) {
      if (firstCall) {
        firstCall = false;
        return undefined;
      }
      return originalFind.apply(this, args as never);
    };

    try {
      const { getLearningPair, LEARNING_PAIRS } = await import('@/lib/languages');
      const pair = getLearningPair('missing-id');
      expect(pair).toBe(LEARNING_PAIRS[0]);
    } finally {
      Array.prototype.find = originalFind;
    }
  });

  it('returns the default pair when lookup misses despite validation', async () => {
    vi.resetModules();
    const { getLearningPair, LEARNING_PAIRS, DEFAULT_PAIR_ID } = await import('@/lib/languages');
    const originalFind = LEARNING_PAIRS.find;
    const originalSome = LEARNING_PAIRS.some;

    LEARNING_PAIRS.find = () => undefined;
    LEARNING_PAIRS.some = () => true;

    try {
      const pair = getLearningPair('ghost');
      expect(pair.id).toBe(DEFAULT_PAIR_ID);
    } finally {
      LEARNING_PAIRS.find = originalFind;
      LEARNING_PAIRS.some = originalSome;
    }
  });
});
