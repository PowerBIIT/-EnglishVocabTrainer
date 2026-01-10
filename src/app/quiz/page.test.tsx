import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizPage from '@/app/quiz/page';
import { resetStore } from '@/test/utils';
import { useVocabStore } from '@/lib/store';
import * as navigation from 'next/navigation';

const setId = 'set-123';

describe('QuizPage', () => {
  beforeEach(() => {
    resetStore();
    const useSearchParamsMock = navigation.useSearchParams as unknown as vi.Mock;
    useSearchParamsMock.mockReturnValue(new URLSearchParams(`setId=${setId}`));

    useVocabStore.setState((state) => ({
      ...state,
      isReady: true,
      sets: [
        {
          id: setId,
          name: 'Biologia',
          createdAt: new Date(),
          languagePair: 'pl-en',
        },
      ],
      vocabulary: [
        {
          id: 'word-1',
          en: 'cell',
          phonetic: '',
          pl: 'komorka',
          category: 'School',
          setIds: [setId],
          difficulty: 'easy',
          created_at: new Date(),
          source: 'manual',
          languagePair: 'pl-en',
        },
      ],
    }));
  });

  it('preselects a set from the query param', async () => {
    render(<QuizPage />);

    expect(await screen.findByRole('heading', { name: 'Quiz' })).toBeVisible();

    await waitFor(() => {
      expect(screen.getByTestId('set-filter')).toHaveValue(setId);
    });
  });
});
