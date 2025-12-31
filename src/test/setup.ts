import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string | { src: string };
    alt: string;
  }) =>
    React.createElement('img', {
      src: typeof src === 'string' ? src : src?.src,
      alt,
      ...props,
    }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: vi.fn(() => ({
    data: { user: { name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
    update: vi.fn(),
  })),
  signOut: vi.fn(),
}));

type StripePricesResponse = {
  monthly: { id: string; unitAmount: number; currency: string };
  annual: { id: string; unitAmount: number; currency: string; savings: number };
  trialDays: number;
};

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const defaultFetch = vi.fn(async (input: RequestInfo | URL): Promise<MockResponse> => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes('/api/stripe/prices')) {
    return {
      ok: true,
      status: 200,
      json: async (): Promise<StripePricesResponse> => ({
        monthly: { id: 'price_monthly', unitAmount: 9900, currency: 'pln' },
        annual: { id: 'price_annual', unitAmount: 99000, currency: 'pln', savings: 20 },
        trialDays: 7,
      }),
      text: async (): Promise<string> => '',
    };
  }

  return {
    ok: true,
    status: 200,
    json: async (): Promise<null> => null,
    text: async (): Promise<string> => '',
  };
});

// Default fetch mock to avoid relative URL warnings in jsdom tests.
vi.stubGlobal('fetch', defaultFetch);
