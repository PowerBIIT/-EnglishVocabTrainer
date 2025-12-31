import { describe, expect, it, beforeEach, vi, type MockedFunction } from 'vitest';
import { NextResponse } from 'next/server';

// Mock dependencies
const mockRequireAdmin = vi.fn();
const mockGetStripe = vi.fn();
const mockGetActivePriceIds = vi.fn();

vi.mock('@/middleware/adminAuth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: () => mockGetStripe(),
  getActivePriceIds: () => mockGetActivePriceIds(),
}));

// Import after mocking
const loadModule = async () => {
  vi.resetModules();
  return import('./route');
};

describe('GET /api/admin/pricing/prices', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockGetStripe.mockReset();
    mockGetActivePriceIds.mockReset();
  });

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const { GET } = await loadModule();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns prices with active price flags', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });
    mockGetActivePriceIds.mockResolvedValue({
      PRO_MONTHLY: 'price_monthly',
      PRO_ANNUAL: 'price_annual',
    });

    const mockPrices = {
      data: [
        {
          id: 'price_monthly',
          product: { id: 'prod_test', name: 'Henio PRO' },
          unit_amount: 2999,
          currency: 'pln',
          recurring: { interval: 'month', interval_count: 1 },
          active: true,
          nickname: 'Monthly PRO',
          created: 1700000001, // newer
        },
        {
          id: 'price_annual',
          product: { id: 'prod_test', name: 'Henio PRO' },
          unit_amount: 24999,
          currency: 'pln',
          recurring: { interval: 'year', interval_count: 1 },
          active: true,
          nickname: 'Annual PRO',
          created: 1700000000, // older
        },
      ],
    };

    mockGetStripe.mockReturnValue({
      prices: { list: vi.fn().mockResolvedValue(mockPrices) },
    });

    const { GET } = await loadModule();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prices).toHaveLength(2);
    // First price is monthly (newer, sorted by created desc)
    expect(data.prices[0].id).toBe('price_monthly');
    expect(data.prices[0].isActiveMonthly).toBe(true);
    expect(data.prices[0].isActiveAnnual).toBe(false);
    // Second price is annual (older)
    expect(data.prices[1].id).toBe('price_annual');
    expect(data.prices[1].isActiveMonthly).toBe(false);
    expect(data.prices[1].isActiveAnnual).toBe(true);
    expect(data.activePriceIds.monthly).toBe('price_monthly');
    expect(data.activePriceIds.annual).toBe('price_annual');
  });

  it('handles Stripe API errors gracefully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });
    mockGetActivePriceIds.mockResolvedValue({
      PRO_MONTHLY: '',
      PRO_ANNUAL: '',
    });
    mockGetStripe.mockReturnValue({
      prices: { list: vi.fn().mockRejectedValue(new Error('Stripe error')) },
      products: { list: vi.fn().mockResolvedValue({ data: [] }) },
    });

    const { GET } = await loadModule();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch prices');
  });
});

describe('POST /api/admin/pricing/prices', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockGetStripe.mockReset();
  });

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const { POST } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod_test', unitAmount: 2999, currency: 'pln', interval: 'month' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('validates required fields', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const { POST } = await loadModule();

    // Missing productId
    const request1 = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ unitAmount: 2999, currency: 'pln', interval: 'month' }),
    });
    const response1 = await POST(request1);
    expect(response1.status).toBe(400);

    // Missing unitAmount
    const request2 = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod_test', currency: 'pln', interval: 'month' }),
    });
    const response2 = await POST(request2);
    expect(response2.status).toBe(400);
  });

  it('creates a price successfully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const mockCreatedPrice = { id: 'price_new' };
    mockGetStripe.mockReturnValue({
      prices: { create: vi.fn().mockResolvedValue(mockCreatedPrice) },
    });

    const { POST } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_test',
        unitAmount: 2999,
        currency: 'pln',
        interval: 'month',
        nickname: 'Test Price',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.price.id).toBe('price_new');
  });
});
