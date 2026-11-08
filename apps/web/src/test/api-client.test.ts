import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, ApiError } from '../services/api-client';
import { useAuthStore } from '../features/auth/stores/auth-store';

describe('api-client (Single-Flight Silent Refresh & Interceptor)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it('automatically attaches Authorization Bearer header when token exists in store', async () => {
    useAuthStore.setState({ accessToken: 'test-in-memory-token' });

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { message: 'success' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await request<{ message: string }>('/protected-resource');

    expect(result).toEqual({ message: 'success' });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/protected-resource'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-in-memory-token',
        }),
      }),
    );
  });

  it('coordinates concurrent 401 errors through a single refresh request and replays both', async () => {
    useAuthStore.setState({ accessToken: 'old-expired-token' });

    let refreshCallCount = 0;

    vi.spyOn(global, 'fetch').mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes('/auth/refresh')) {
          refreshCallCount++;
          // Simulate network latency for refresh
          await new Promise((r) => setTimeout(r, 20));
          return new Response(
            JSON.stringify({ data: { accessToken: 'brand-new-rotated-token' } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url.includes('/resource-a') || url.includes('/resource-b')) {
          // Return 401 if called with old token, 200 if called with new token
          const headers = (init?.headers as Record<string, string>) || {};
          if (headers.Authorization === 'Bearer brand-new-rotated-token') {
            return new Response(JSON.stringify({ data: { item: url.split('/').pop() } }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ statusCode: 401, message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(null, { status: 404 });
      },
    );

    // Launch two concurrent requests that both encounter 401
    const [resA, resB] = await Promise.all([
      request<{ item: string }>('/resource-a'),
      request<{ item: string }>('/resource-b'),
    ]);

    expect(resA).toEqual({ item: 'resource-a' });
    expect(resB).toEqual({ item: 'resource-b' });

    // Verifies Single-Flight Mutex: exactly 1 refresh was made despite 2 concurrent 401s!
    expect(refreshCallCount).toBe(1);
    expect(useAuthStore.getState().accessToken).toBe('brand-new-rotated-token');
  });

  it('marks store unauthenticated and throws ApiError if refresh fails with 401', async () => {
    useAuthStore.setState({ accessToken: 'stolen-or-expired-token', status: 'authenticated' });

    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/refresh')) {
        return new Response(JSON.stringify({ statusCode: 401, message: 'Session expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ statusCode: 401, message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await expect(request('/some-endpoint')).rejects.toThrow(ApiError);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
