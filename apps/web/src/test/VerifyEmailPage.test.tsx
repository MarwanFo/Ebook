import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { authApi } from '../features/auth/services/auth-api';

vi.mock('../features/auth/services/auth-api', () => ({
  authApi: {
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

describe('VerifyEmailPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = (initialRoute = '/verify-email') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('renders verify form when no token is present', () => {
    renderComponent('/verify-email');
    expect(screen.getByText(/Verify Your Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Verification Email/i })).toBeInTheDocument();
  });

  it('verifies token automatically when present in URL', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({
      message: 'Email address verified successfully.',
    });

    renderComponent('/verify-email?token=valid-test-token');

    await waitFor(() => {
      expect(authApi.verifyEmail).toHaveBeenCalledWith('valid-test-token');
      expect(screen.getByText(/Email Verified!/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Enter Library/i })).toBeInTheDocument();
    });
  });

  it('displays error and resend form when token is expired or invalid', async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValueOnce(
      new Error('Invalid or expired verification link.'),
    );

    renderComponent('/verify-email?token=expired-token');

    await waitFor(() => {
      expect(screen.getByText(/Verification Link Expired/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid or expired verification link/i)).toBeInTheDocument();
    });
  });

  it('submits resend verification form successfully', async () => {
    vi.mocked(authApi.resendVerification).mockResolvedValueOnce({
      message: 'Verification link sent.',
    });

    renderComponent('/verify-email');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email Address/i), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: /Send Verification Email/i }));

    await waitFor(() => {
      expect(authApi.resendVerification).toHaveBeenCalledWith('reader@example.com');
      expect(screen.getByText(/Verification link sent!/i)).toBeInTheDocument();
    });
  });
});
