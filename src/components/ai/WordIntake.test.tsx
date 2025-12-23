import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { WordIntake } from '@/components/ai/WordIntake';
import { useVocabStore } from '@/lib/store';
import { resetStore } from '@/test/utils';

describe('WordIntake', () => {
  beforeEach(() => {
    resetStore();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          category_suggestion: 'Klasowka',
          words: [
            { target: 'apple', native: 'jablko', phonetic: '/apple/', difficulty: 'easy' },
          ],
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('adds parsed words to the library', async () => {
    const user = userEvent.setup();
    render(<WordIntake variant="chat" />);

    const input = await screen.findByPlaceholderText('Wpisz słówka lub zapytaj...');
    await user.type(input, 'apple - jablko');
    await user.keyboard('{Enter}');

    expect(
      await screen.findByText('Zaznacz słówka, które chcesz dodać do biblioteki.')
    ).toBeVisible();

    const addButton = screen.getByRole('button', { name: /Dodaj/ });
    await user.click(addButton);

    await waitFor(() => {
      expect(useVocabStore.getState().getActiveVocabulary()).toHaveLength(1);
    });

    expect(await screen.findByText(/Dodano/)).toBeVisible();
  });
});
