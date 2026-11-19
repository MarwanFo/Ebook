import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByLabelText(/^Passphrase$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Passphrase/i)).toBeInTheDocument();
    expect(screen.getByText(/Minimum 15 characters/i)).toBeInTheDocument();
  });

  it('rejects passwords shorter than 15 characters with client-side guidance', async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email Address/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/^Passphrase$/i), 'short-pass-123'); // 14 chars
    await user.type(screen.getByLabelText(/Confirm Passphrase/i), 'short-pass-123');
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/at least 15 Unicode characters/i);
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('rejects passphrases with repetitive trivial characters', async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email Address/i), 'repeat@example.com');
    await user.type(screen.getByLabelText(/^Passphrase$/i), 'aaaaaaaaaaaaaaaa'); // 16 chars, 1 unique
    await user.type(screen.getByLabelText(/Confirm Passphrase/i), 'aaaaaaaaaaaaaaaa');
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/too many repetitive characters/i);
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('shows live matching indicator and rejects submission when passphrases do not match', async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email Address/i), 'mismatch@example.com');
    await user.type(screen.getByLabelText(/^Passphrase$/i), 'correct horse battery staple 2026');
    await user.type(screen.getByLabelText(/Confirm Passphrase/i), 'different horse battery staple');

    expect(screen.getByText(/Passphrases do not match/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Passphrases do not match/i);
    expect(authApi.register).not.toHaveBeenCalled();

    // Now fix confirm passphrase to match
    await user.clear(screen.getByLabelText(/Confirm Passphrase/i));
    await user.type(
      screen.getByLabelText(/Confirm Passphrase/i),
      'correct horse battery staple 2026',
    );

    expect(screen.getByText(/Passphrases match/i)).toBeInTheDocument();
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
    await user.click(screen.getByLabelText(/^Passphrase$/i));
    await user.paste(validPassphrase);
    await user.click(screen.getByLabelText(/Confirm Passphrase/i));
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

  it('includes populated honeypot botField when a bot fills out the hidden trap', async () => {
    const mockSession = {
      user: {
        id: 'u-bot',
        email: 'bot@example.com',
        displayName: 'Bot',
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

    const validPassphrase = 'super-secure-passphrase-12345';
    await user.type(screen.getByLabelText(/Email Address/i), 'bot@example.com');
    await user.type(screen.getByLabelText(/^Passphrase$/i), validPassphrase);
    await user.type(screen.getByLabelText(/Confirm Passphrase/i), validPassphrase);
    await user.type(screen.getByLabelText(/Leave this field blank/i), 'automated spam script');

    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'bot@example.com',
          botField: 'automated spam script',
        }),
      );
    });
  });

  it('renders sign in and reset password navigation shortcuts when account already exists', async () => {
    vi.mocked(authApi.register).mockRejectedValueOnce(
      new Error('An account with this email address already exists.'),
    );

    renderComponent();
    const user = userEvent.setup();

    const validPassphrase = 'super-secure-passphrase-12345';
    await user.type(screen.getByLabelText(/Email Address/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^Passphrase$/i), validPassphrase);
    await user.type(screen.getByLabelText(/Confirm Passphrase/i), validPassphrase);

    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/already exists/i);
      expect(within(alert).getByRole('link', { name: /Sign in/i })).toBeInTheDocument();
      expect(within(alert).getByRole('link', { name: /Forgot password/i })).toBeInTheDocument();
    });
  });
});
