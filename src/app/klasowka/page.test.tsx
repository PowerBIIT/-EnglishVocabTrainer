import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KlasowkaPage from '@/app/klasowka/page';
import { resetStore } from '@/test/utils';
import * as navigation from 'next/navigation';

const push = vi.fn();

vi.mock('@/components/ai/WordIntake', () => ({
  WordIntake: ({ onWordsAdded }: { onWordsAdded?: (payload: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onWordsAdded?.({
          setId: 'set-1',
          setName: 'Biologia',
          wordCount: 10,
          category: 'School',
        })
      }
    >
      Mock intake
    </button>
  ),
}));

describe('KlasowkaPage', () => {
  beforeEach(() => {
    resetStore();
    push.mockReset();
    vi.spyOn(navigation, 'useRouter').mockReturnValue({
      push,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it('shows a summary and routes to the quiz', async () => {
    const user = userEvent.setup();
    render(<KlasowkaPage />);

    expect(await screen.findByRole('heading', { name: /Klas/ })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Mock intake' }));

    expect(await screen.findByText('Zestaw gotowy')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Start quizu' }));
    expect(push).toHaveBeenCalledWith('/quiz?setId=set-1');
  });
});
