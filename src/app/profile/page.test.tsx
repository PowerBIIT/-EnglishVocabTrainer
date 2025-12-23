import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import ProfilePage from '@/app/profile/page';
import { resetStore } from '@/test/utils';

describe('ProfilePage', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders the profile header in Polish', async () => {
    render(<ProfilePage />);

    expect(await screen.findByText('Profil')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Test User' })).toBeVisible();
  });
});
