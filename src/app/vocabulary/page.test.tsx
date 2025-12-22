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
        pl: 'хліб',
        category: 'Food',
        difficulty: 'easy',
        created_at: new Date('2024-01-01T00:00:00Z'),
        source: 'manual',
        languagePair: 'uk-pl',
        setIds: [],
      },
      {
        id: 'word-2',
        en: 'milk',
        phonetic: '/milk/',
        pl: 'молоко',
        category: 'Food',
        difficulty: 'medium',
        created_at: new Date('2024-01-01T00:00:00Z'),
        source: 'manual',
        languagePair: 'uk-pl',
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

    expect(await screen.findByText('Мої слова')).toBeVisible();
    expect(screen.getByText(/2 слів у 1 категоріях/)).toBeVisible();
    expect(screen.getByText('Їжа (2)')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Без набору (2)' })).toBeVisible();
    expect(screen.getByPlaceholderText('Пошук слів...')).toBeVisible();
  });
});
