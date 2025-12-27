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

  it('shows the pair selection step', async () => {
    render(<OnboardingPage />);

    expect(await screen.findByText('Wybierz parę językową')).toBeVisible();
    const continueButtons = screen.getAllByRole('button', { name: 'Dalej' });
    expect(continueButtons.length).toBeGreaterThan(0);
    expect(continueButtons[0]).toBeInTheDocument();
  });

  it('updates the learning pair when a new option is selected', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const option = await screen.findByRole('button', {
      name: /Ukraiński → Angielski/,
    });
    await user.click(option);

    expect(useVocabStore.getState().settings.learning.pairId).toBe('uk-en');
  });
});
