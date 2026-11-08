import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterForm } from '../features/auth/components/RegisterForm';
import { authApi } from '../features/auth/services/auth-api';
import { UserRole } from '@bookflow/shared-types';

vi.mock('../features/auth/services/auth-api', () => ({
  authApi: {
    register: vi.fn(),
  },
}));

describe('RegisterForm', () => {
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
          <RegisterForm />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders registration fields and initial passphrase guidance', () => {
    renderComponent();

    expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Passphrase/i)).toBeInTheDocument();
    expect(screen.getByText(/Minimum 15 characters/i)).toBeInTheDocument();
  });

  it('rejects passwords shorter than 15 characters with client-side guidance', async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email Address/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/Passphrase/i), 'short-pass-123'); // 14 chars
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/at least 15 Unicode characters/i);
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('accepts passphrases with spaces and unicode emojis (>=15 chars) and submits successfully', async () => {
    const mockSession = {
      user: {
        id: 'u-2',
        email: 'newuser@example.com',
        displayName: 'New Bookworm',
        avatarUrl: null,
        role: UserRole.USER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      accessToken: 'access.jwt.token',
    };

    vi.mocked(authApi.register).mockResolvedValueOnce(mockSession);

    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Display Name/i), 'New Bookworm');
    await user.type(screen.getByLabelText(/Email Address/i), 'newuser@example.com');

    // Paste full passphrase with Unicode emojis & spaces
    const validPassphrase = 'my bookflow adventure 📚🌟';
    await user.click(screen.getByLabelText(/Passphrase/i));
    await user.paste(validPassphrase);

    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: validPassphrase,
        displayName: 'New Bookworm',
      });
    });
  });
});

