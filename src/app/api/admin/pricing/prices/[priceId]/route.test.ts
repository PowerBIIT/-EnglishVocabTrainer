import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mock dependencies
const mockRequireAdmin = vi.fn();
const mockGetStripe = vi.fn();
const mockSetAppConfig = vi.fn();

vi.mock('@/middleware/adminAuth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: () => mockGetStripe(),
}));

vi.mock('@/lib/config', () => ({
  setAppConfig: (opts: unknown) => mockSetAppConfig(opts),
}));

// Import after mocking
const loadModule = async () => {
  vi.resetModules();
  return import('./route');
};

describe('PATCH /api/admin/pricing/prices/[priceId]', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockGetStripe.mockReset();
    mockSetAppConfig.mockReset();
  });

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const { PATCH } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ archive: true }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ priceId: 'price_test' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('archives a price successfully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const mockUpdateFn = vi.fn().mockResolvedValue({ id: 'price_test', active: false });
    mockGetStripe.mockReturnValue({
      prices: { update: mockUpdateFn },
    });

    const { PATCH } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ archive: true }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ priceId: 'price_test' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.action).toBe('archived');
    expect(mockUpdateFn).toHaveBeenCalledWith('price_test', { active: false });
  });

  it('sets price as active monthly', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const mockRetrieveFn = vi.fn().mockResolvedValue({ id: 'price_test', active: true });
    mockGetStripe.mockReturnValue({
      prices: { retrieve: mockRetrieveFn },
    });
    mockSetAppConfig.mockResolvedValue({});

    const { PATCH } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ setActive: 'monthly' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ priceId: 'price_test' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.action).toBe('setActive');
    expect(data.type).toBe('monthly');
    expect(mockSetAppConfig).toHaveBeenCalledWith({
      key: 'STRIPE_PRO_MONTHLY_PRICE_ID',
      value: 'price_test',
      updatedBy: 'admin@test.com',
      dataType: 'string',
    });
  });

  it('sets price as active annual', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const mockRetrieveFn = vi.fn().mockResolvedValue({ id: 'price_test', active: true });
    mockGetStripe.mockReturnValue({
      prices: { retrieve: mockRetrieveFn },
    });
    mockSetAppConfig.mockResolvedValue({});

    const { PATCH } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ setActive: 'annual' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ priceId: 'price_test' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.action).toBe('setActive');
    expect(data.type).toBe('annual');
    expect(mockSetAppConfig).toHaveBeenCalledWith({
      key: 'STRIPE_PRO_ANNUAL_PRICE_ID',
      value: 'price_test',
      updatedBy: 'admin@test.com',
      dataType: 'string',
    });
  });

  it('rejects setting archived price as active', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const mockRetrieveFn = vi.fn().mockResolvedValue({ id: 'price_test', active: false });
    mockGetStripe.mockReturnValue({
      prices: { retrieve: mockRetrieveFn },
    });

    const { PATCH } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ setActive: 'monthly' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ priceId: 'price_test' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot set an archived price as active');
  });

  it('returns error when no valid action specified', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    const { PATCH } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    const response = await PATCH(request, { params: Promise.resolve({ priceId: 'price_test' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No valid action specified');
  });

  it('handles Stripe errors gracefully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { email: 'admin@test.com' } });

    mockGetStripe.mockReturnValue({
      prices: { update: vi.fn().mockRejectedValue(new Error('Price not found')) },
    });

    const { PATCH } = await loadModule();
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ archive: true }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ priceId: 'price_invalid' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Price not found');
  });
});
