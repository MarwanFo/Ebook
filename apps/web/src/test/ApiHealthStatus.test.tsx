import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiHealthStatus } from '../components/health/ApiHealthStatus';
import { api, ApiError } from '../services/api-client';

describe('ApiHealthStatus Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    vi.resetAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithClient = (client: QueryClient) => {
    return render(
      <QueryClientProvider client={client}>
        <ApiHealthStatus refetchInterval={false} />
      </QueryClientProvider>,
    );
  };

  it('renders operational state when health and readiness probes succeed', async () => {
    vi.spyOn(api, 'getHealth').mockResolvedValueOnce({
      status: 'ok',
      uptime: 42.5,
      timestamp: '2026-08-14T20:00:00.000Z',
    });
    vi.spyOn(api, 'getReady').mockResolvedValueOnce({
      status: 'ok',
      database: 'connected',
      timestamp: '2026-08-14T20:00:00.000Z',
    });

    renderWithClient(queryClient);

    await waitFor(() => {
      expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
      expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);
      expect(screen.getByText('42.5s')).toBeInTheDocument();
    });
  });

  it('renders unavailable state without crashing when API is unreachable', async () => {
    vi.spyOn(api, 'getHealth').mockRejectedValueOnce(new Error('Failed to fetch'));
    vi.spyOn(api, 'getReady').mockRejectedValueOnce(
      new ApiError({
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection check failed',
        requestId: 'test-req-id-999',
      }),
    );

    renderWithClient(queryClient);

    await waitFor(() => {
      expect(screen.getByText('API Unavailable')).toBeInTheDocument();
      expect(
        screen.getByText('Failed to reach API server. Ensure backend is running.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Error: Database connection check failed')).toBeInTheDocument();
      expect(screen.getByText('Req ID: test-req-id-999')).toBeInTheDocument();
    });
  });
});
