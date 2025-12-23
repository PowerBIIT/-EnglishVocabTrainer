import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import QuizPage from '@/app/quiz/page';
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
      {
        id: 'word-3',
        en: 'train',
        phonetic: '/train/',
        pl: 'pociąg',
        category: 'Travel',
        difficulty: 'medium',
        created_at: new Date('2024-01-01T00:00:00Z'),
        source: 'manual',
        languagePair: 'pl-en',
        setIds: [],
      },
      {
        id: 'word-4',
        en: 'ticket',
        phonetic: '/ticket/',
        pl: 'bilet',
        category: 'Travel',
        difficulty: 'hard',
        created_at: new Date('2024-01-01T00:00:00Z'),
        source: 'manual',
        languagePair: 'pl-en',
        setIds: [],
      },
    ],
  }));
};

describe('QuizPage', () => {
  beforeEach(() => {
    resetStore();
    seedVocabulary();
  });

  it('renders quiz setup with modes and start button', async () => {
    render(<QuizPage />);

    expect(await screen.findByText('Quiz')).toBeVisible();
    expect(screen.getByText('Wybierz zestaw i sprawdź swoją wiedzę')).toBeVisible();
    expect(screen.getByText('Tryb quizu')).toBeVisible();
    expect(screen.getByText('Wpisywanie')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Rozpocznij quiz' })).toBeVisible();
  });
});
