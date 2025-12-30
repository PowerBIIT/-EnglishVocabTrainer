import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingPage from '@/app/onboarding/page';
import { useVocabStore } from '@/lib/store';
import { resetStore } from '@/test/utils';

// Mock fetch for consent submission
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('OnboardingPage', () => {
  beforeEach(() => {
    resetStore();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  it('shows the consent step first', async () => {
    render(<OnboardingPage />);

    expect(await screen.findByText('Zgody i regulamin')).toBeVisible();
    // There are two buttons (mobile + desktop), check at least one exists
    const buttons = screen.getAllByRole('button', { name: /Akceptuje i kontynuuje/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows the path selection step after accepting consent', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Complete consent step
    const termsCheckbox = await screen.findByRole('checkbox', { name: /Akceptuje Regulamin/i });
    const ageCheckbox = screen.getByRole('checkbox', { name: /16 lat/i });
    await user.click(termsCheckbox);
    await user.click(ageCheckbox);

    // Click first matching button (both mobile and desktop exist)
    const continueButtons = screen.getAllByRole('button', { name: /Akceptuje i kontynuuje/i });
    await user.click(continueButtons[0]);

    // Now should see path selection
    expect(await screen.findByText('Wybierz ścieżkę ucznia')).toBeVisible();
  });

  it('updates the learning pair when a path is selected', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Complete consent step first
    const termsCheckbox = await screen.findByRole('checkbox', { name: /Akceptuje Regulamin/i });
    const ageCheckbox = screen.getByRole('checkbox', { name: /16 lat/i });
    await user.click(termsCheckbox);
    await user.click(ageCheckbox);
    const continueButtons = screen.getAllByRole('button', { name: /Akceptuje i kontynuuje/i });
    await user.click(continueButtons[0]);

    // Wait for path step and select Ukrainian path
    const option = await screen.findByRole('button', {
      name: /Uczeń z Ukrainy w Polsce/,
    });
    await user.click(option);

    expect(useVocabStore.getState().settings.learning.pairId).toBe('uk-pl');
  });
});
