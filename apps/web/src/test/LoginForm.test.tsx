import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginForm } from '../features/auth/components/LoginForm';
import { authApi } from '../features/auth/services/auth-api';
import { UserRole } from '@bookflow/shared-types';

vi.mock('../features/auth/services/auth-api', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

describe('LoginForm', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders login inputs, submit button, and navigation links', () => {
    renderComponent();

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Create one now/i)).toBeInTheDocument();
  });

  it('validates empty email and displays client-side validation error', async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Please enter your email address/i);
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('supports pasting password without truncation and submits credentials', async () => {
    const mockSession = {
      user: {
        id: 'u-1',
        email: 'reader@example.com',
        displayName: 'Avid Reader',
        avatarUrl: null,
        role: UserRole.USER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      accessToken: 'access.jwt.token',
    };

    vi.mocked(authApi.login).mockResolvedValueOnce(mockSession);

    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email Address/i), 'reader@example.com');

    // Simulate password manager paste with spaces and unicode
    const pastedPassphrase = 'correct horse battery staple 🌟';
    await user.click(screen.getByLabelText(/Password/i));
    await user.paste(pastedPassphrase);

    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'reader@example.com',
        password: pastedPassphrase,
      });
    });
  });

  it('displays server error message on login failure', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error('Invalid email address or password.'));

    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email Address/i), 'reader@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'wrongpassword12345');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid email address or password/i);
    });
  });
});
