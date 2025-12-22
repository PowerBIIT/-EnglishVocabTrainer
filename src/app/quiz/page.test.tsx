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
      {
        id: 'word-3',
        en: 'train',
        phonetic: '/train/',
        pl: 'поїзд',
        category: 'Travel',
        difficulty: 'medium',
        created_at: new Date('2024-01-01T00:00:00Z'),
        source: 'manual',
        languagePair: 'uk-pl',
        setIds: [],
      },
      {
        id: 'word-4',
        en: 'ticket',
        phonetic: '/ticket/',
        pl: 'квиток',
        category: 'Travel',
        difficulty: 'hard',
        created_at: new Date('2024-01-01T00:00:00Z'),
        source: 'manual',
        languagePair: 'uk-pl',
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

    expect(await screen.findByText('Квіз')).toBeVisible();
    expect(screen.getByText('Обери набір і перевір свої знання')).toBeVisible();
    expect(screen.getByText('Режим квізу')).toBeVisible();
    expect(screen.getByText('Введення')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Почати квіз' })).toBeVisible();
  });
});
