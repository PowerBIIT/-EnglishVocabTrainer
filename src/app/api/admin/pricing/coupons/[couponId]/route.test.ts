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

describe('DELETE /api/admin/pricing/coupons/[couponId]', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockGetStripe.mockReset();
  });

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const { DELETE } = await loadModule();
    const request = new Request('http://localhost', { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ couponId: 'coupon_test' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('deletes a coupon successfully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const mockDelFn = vi.fn().mockResolvedValue({ deleted: true });
    mockGetStripe.mockReturnValue({
      coupons: { del: mockDelFn },
    });

    const { DELETE } = await loadModule();
    const request = new Request('http://localhost', { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ couponId: 'coupon_test' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelFn).toHaveBeenCalledWith('coupon_test');
  });

  it('handles Stripe errors gracefully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    mockGetStripe.mockReturnValue({
      coupons: { del: vi.fn().mockRejectedValue(new Error('Coupon not found')) },
    });

    const { DELETE } = await loadModule();
    const request = new Request('http://localhost', { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ couponId: 'coupon_invalid' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Coupon not found');
  });
});
