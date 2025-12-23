import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import VocabularyPage from '@/app/vocabulary/page';
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

describe('VocabularyPage', () => {
  beforeEach(() => {
    resetStore();
    seedVocabulary();
  });

  it('renders the vocabulary summary and categories', async () => {
    render(<VocabularyPage />);

    expect(await screen.findByText('Moje słówka')).toBeVisible();
    expect(screen.getByText(/2 słówek w 1 kategoriach/)).toBeVisible();
    expect(screen.getByText('Jedzenie (2)')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Bez zestawu (2)' })).toBeVisible();
    expect(screen.getByPlaceholderText('Szukaj słówek...')).toBeVisible();
  });
});
