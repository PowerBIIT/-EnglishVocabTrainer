import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import FlashcardsPage from '@/app/flashcards/page';
import { useVocabStore } from '@/lib/store';
import { resetStore } from '@/test/utils';

const seedVocabulary = () => {
  useVocabStore.setState((state) => ({
    ...state,
    vocabulary: [
      {
        id: 'word-1',
        en: 'bread',
        phonetic: '/bread/',
        pl: 'chleb',
        category: 'Food',
        difficulty: 'easy',
        created_at: new Date('2024-01-01T00:00:00Z'),
        source: 'manual',
        languagePair: 'pl-en',
        setIds: [],
      },
      {
        id: 'word-2',
        en: 'milk',
        phonetic: '/milk/',
        pl: 'mleko',
        category: 'Food',
        difficulty: 'medium',
        created_at: new Date('2024-01-01T00:00:00Z'),
        source: 'manual',
        languagePair: 'pl-en',
        setIds: [],
      },
    ],
  }));
};

describe('FlashcardsPage', () => {
  beforeEach(() => {
    resetStore();
    seedVocabulary();
  });

  it('renders flashcards setup and session controls', async () => {
    render(<FlashcardsPage />);

    expect(await screen.findByText('Fiszki')).toBeVisible();
    expect(screen.getByText('Wybierz zestaw lub kategorię i zacznij naukę')).toBeVisible();
    expect(screen.getByText('Ustawienia sesji')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Rozpocznij sesję' })).toBeVisible();
  });
});
