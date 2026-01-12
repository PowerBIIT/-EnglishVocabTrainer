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
    const mockFetch = vi.fn().mockImplementation(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/ai/generate-words')) {
        return {
          ok: true,
          json: async () => ({
            topic: 'biologia',
            level: 'A2',
            words: [
              {
                target: 'cell',
                native: 'komorka',
                phonetic: '/sel/',
                difficulty: 'easy',
              },
            ],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          category_suggestion: 'Klasowka',
          words: [
            { target: 'apple', native: 'jablko', phonetic: '/apple/', difficulty: 'easy' },
          ],
        }),
      };
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('adds parsed words to the library', async () => {
    const user = userEvent.setup();
    render(<WordIntake variant="chat" />);

    const input = await screen.findByPlaceholderText('Wpisz słówka lub temat...');
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
  }, 10_000);

  it('shows a helpful message for general questions', async () => {
    const user = userEvent.setup();
    render(<WordIntake variant="chat" />);

    const input = await screen.findByPlaceholderText('Wpisz słówka lub temat...');
    await user.type(input, 'Jak zrobić tort?');
    await user.keyboard('{Enter}');

    expect(
      await screen.findByText(/To wygląda na ogólne pytanie/i)
    ).toBeVisible();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('accepts vocabulary questions that include generation intent', async () => {
    const user = userEvent.setup();
    render(<WordIntake variant="chat" />);

    const input = await screen.findByPlaceholderText('Wpisz słówka lub temat...');
    await user.type(input, 'Czy możesz wygenerować 8 słówek na temat biologii?');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/ai/generate-words',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('parses Polish "z <topic>" generation requests (quick actions)', async () => {
    const user = userEvent.setup();
    render(<WordIntake variant="chat" />);

    const input = await screen.findByPlaceholderText('Wpisz słówka lub temat...');
    await user.type(input, 'Wygeneruj 12 słówek z biologii');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/ai/generate-words',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const fetchMock = globalThis.fetch as unknown as {
      mock: { calls: Array<[RequestInfo, RequestInit?]> };
    };
    const call = fetchMock.mock.calls.find(([input]) => input === '/api/ai/generate-words');
    expect(call).toBeTruthy();
    const body = JSON.parse((call?.[1]?.body as string) ?? '{}') as {
      topic?: string;
      count?: number;
    };
    expect(body.topic).toBe('biologii');
    expect(body.count).toBe(12);
  });

  it('extracts Ukrainian "слів" counts in generation requests', async () => {
    useVocabStore.getState().updateSettings('general', { language: 'uk' });

    const user = userEvent.setup();
    render(<WordIntake variant="chat" />);

    const input = await screen.findByPlaceholderText('Введи слова або тему...');
    await user.type(input, 'Згенеруй 12 слів на тему школа');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/ai/generate-words',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const fetchMock = globalThis.fetch as unknown as {
      mock: { calls: Array<[RequestInfo, RequestInit?]> };
    };
    const call = fetchMock.mock.calls.find(([input]) => input === '/api/ai/generate-words');
    expect(call).toBeTruthy();
    const body = JSON.parse((call?.[1]?.body as string) ?? '{}') as {
      topic?: string;
      count?: number;
    };
    expect(body.topic).toBe('школа');
    expect(body.count).toBe(12);
  });

  it('clears generated words after canceling onboarding review', async () => {
    const user = userEvent.setup();
    render(<WordIntake variant="onboarding" />);

    const input = await screen.findByPlaceholderText('Wpisz słówka lub temat...');
    await user.type(input, 'Wygeneruj 5 słówek o biologii');
    await user.keyboard('{Enter}');

    expect(await screen.findByText('cell')).toBeVisible();

    const cancelButtons = screen.getAllByRole('button', { name: 'Anuluj' });
    await user.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('cell')).not.toBeInTheDocument();
    });
  }, 10_000);
});
