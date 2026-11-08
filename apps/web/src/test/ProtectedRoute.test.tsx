import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { useAuthStore } from '../features/auth/stores/auth-store';
import { UserRole } from '@bookflow/shared-types';

describe('ProtectedRoute', () => {
  const mockUser = {
    id: 'u-1',
    email: 'reader@example.com',
    displayName: 'Reader',
    avatarUrl: null,
    role: UserRole.USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
  });

  const renderWithRouter = (initialRoute = '/protected') =>
    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Secret Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

  it('renders loading spinner when auth status is initializing', () => {
    useAuthStore.setState({ status: 'initializing', user: null, accessToken: null });

    renderWithRouter();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Verifying session/i)).toBeInTheDocument();
    expect(screen.queryByText(/Secret Protected Content/i)).not.toBeInTheDocument();
  });

  it('renders network error banner with retry option on network failure without redirecting to login', () => {
    useAuthStore.setState({ status: 'network_error', user: null, accessToken: null });

    renderWithRouter();

    expect(screen.getByText(/Connection Issue/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Connection/i })).toBeInTheDocument();
    expect(screen.queryByText(/Login Page/i)).not.toBeInTheDocument();
  });

  it('redirects to /login when user is unauthenticated', () => {
    useAuthStore.setState({ status: 'unauthenticated', user: null, accessToken: null });

    renderWithRouter();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Protected Content')).not.toBeInTheDocument();
  });

  it('renders children content when authenticated', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: mockUser,
      accessToken: 'valid.token',
    });

    renderWithRouter();

    expect(screen.getByText('Secret Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});

