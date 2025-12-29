import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import OnboardingPage from '@/app/onboarding/page';
import { useVocabStore } from '@/lib/store';
import { resetStore } from '@/test/utils';

describe('OnboardingPage', () => {
  beforeEach(() => {
    resetStore();
  });

  it('shows the path selection step', async () => {
    render(<OnboardingPage />);

    expect(await screen.findByText('Wybierz ścieżkę ucznia')).toBeVisible();
    const continueButtons = screen.getAllByRole('button', { name: 'Dalej' });
    expect(continueButtons.length).toBeGreaterThan(0);
    expect(continueButtons[0]).toBeInTheDocument();
  });

  it('updates the learning pair when a path is selected', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const option = await screen.findByRole('button', {
      name: /Uczeń z Ukrainy w Polsce/,
    });
    await user.click(option);

    expect(useVocabStore.getState().settings.learning.pairId).toBe('uk-pl');
  });
});
