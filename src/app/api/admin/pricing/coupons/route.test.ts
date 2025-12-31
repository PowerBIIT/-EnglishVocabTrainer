import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mock dependencies
const mockRequireAdmin = vi.fn();
const mockGetStripe = vi.fn();

vi.mock('@/middleware/adminAuth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: () => mockGetStripe(),
}));

// Import after mocking
const loadModule = async () => {
  vi.resetModules();
  return import('./route');
};

describe('GET /api/admin/pricing/coupons', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockGetStripe.mockReset();
  });

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const { GET } = await loadModule();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns coupons sorted by creation date', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const mockCoupons = {
      data: [
        {
          id: 'coupon_old',
          name: 'Old Coupon',
          percent_off: 10,
          amount_off: null,
          currency: null,
          duration: 'once',
          duration_in_months: null,
          max_redemptions: 100,
          times_redeemed: 5,
          redeem_by: null,
          valid: true,
          created: 1700000000,
        },
        {
          id: 'coupon_new',
          name: 'New Coupon',
          percent_off: 20,
          amount_off: null,
          currency: null,
          duration: 'forever',
          duration_in_months: null,
          max_redemptions: null,
          times_redeemed: 0,
          redeem_by: null,
          valid: true,
          created: 1700000001,
        },
      ],
    };

    mockGetStripe.mockReturnValue({
      coupons: { list: vi.fn().mockResolvedValue(mockCoupons) },
    });

    const { GET } = await loadModule();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.coupons).toHaveLength(2);
    // Sorted by creation date descending (newest first)
    expect(data.coupons[0].id).toBe('coupon_new');
    expect(data.coupons[1].id).toBe('coupon_old');
  });

  it('handles Stripe API errors gracefully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });
    mockGetStripe.mockReturnValue({
      coupons: { list: vi.fn().mockRejectedValue(new Error('Stripe error')) },
    });

    const { GET } = await loadModule();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch coupons');
  });
});

describe('POST /api/admin/pricing/coupons', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockGetStripe.mockReset();
  });

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const { POST } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', percentOff: 10, duration: 'once' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('validates required fields - name and duration', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const { POST } = await loadModule();

    // Missing name
    const request1 = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ percentOff: 10, duration: 'once' }),
    });
    const response1 = await POST(request1);
    const data1 = await response1.json();
    expect(response1.status).toBe(400);
    expect(data1.error).toBe('Name and duration are required');

    // Missing duration
    const request2 = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', percentOff: 10 }),
    });
    const response2 = await POST(request2);
    expect(response2.status).toBe(400);
  });

  it('requires either percentOff or amountOff', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const { POST } = await loadModule();

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', duration: 'once' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Either percentOff or amountOff is required');
  });

  it('rejects when both percentOff and amountOff are provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const { POST } = await loadModule();

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', duration: 'once', percentOff: 10, amountOff: 500 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot specify both percentOff and amountOff');
  });

  it('requires currency when amountOff is provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const { POST } = await loadModule();

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', duration: 'once', amountOff: 500 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Currency is required when using amountOff');
  });

  it('requires durationInMonths for repeating coupons', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const { POST } = await loadModule();

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', duration: 'repeating', percentOff: 10 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('durationInMonths is required for repeating coupons');
  });

  it('creates a percent-off coupon successfully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const mockCreatedCoupon = { id: 'coupon_new' };
    mockGetStripe.mockReturnValue({
      coupons: { create: vi.fn().mockResolvedValue(mockCreatedCoupon) },
    });

    const { POST } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Summer Sale',
        percentOff: 20,
        duration: 'once',
        maxRedemptions: 100,
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.coupon.id).toBe('coupon_new');
  });

  it('creates an amount-off coupon with currency', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const mockCreateFn = vi.fn().mockResolvedValue({ id: 'coupon_fixed' });
    mockGetStripe.mockReturnValue({
      coupons: { create: mockCreateFn },
    });

    const { POST } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Fixed Discount',
        amountOff: 1000,
        currency: 'PLN',
        duration: 'forever',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.coupon.id).toBe('coupon_fixed');
    expect(mockCreateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Fixed Discount',
        amount_off: 1000,
        currency: 'pln', // lowercase
        duration: 'forever',
      })
    );
  });
});
