import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import ChatPage from '@/app/chat/page';
import { resetStore } from '@/test/utils';

describe('ChatPage', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders the AI assistant header and input', async () => {
    render(<ChatPage />);

    expect(await screen.findByRole('heading', { name: 'Asystent AI' })).toBeVisible();
    expect(screen.getByPlaceholderText('Wpisz słówka lub zapytaj...')).toBeVisible();
  });
});
