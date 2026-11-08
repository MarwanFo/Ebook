import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../features/auth/stores/auth-store';
import { UserRole } from '@bookflow/shared-types';

describe('useAuthStore (Strictly In-Memory State)', () => {
  const mockUser = {
    id: 'user-1',
    email: 'reader@example.com',
    displayName: 'Book Reader',
    avatarUrl: null,
    role: UserRole.USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('should initialize with status unauthenticated after clear', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.status).toBe('unauthenticated');
  });

  it('should set authenticated user and access token', () => {
    useAuthStore.getState().setAuthenticated(mockUser, 'test.jwt.token');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('test.jwt.token');
    expect(state.status).toBe('authenticated');
  });

  it('should update access token without altering user', () => {
    useAuthStore.getState().setAuthenticated(mockUser, 'test.jwt.token');
    useAuthStore.getState().setAccessToken('updated.jwt.token');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('updated.jwt.token');
    expect(state.user).toEqual(mockUser);
    expect(state.status).toBe('authenticated');
  });

  it('should set unauthenticated and clear credentials', () => {
    useAuthStore.getState().setAuthenticated(mockUser, 'test.jwt.token');
    useAuthStore.getState().setUnauthenticated();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.status).toBe('unauthenticated');
  });

  it('should transition to network_error without clearing user', () => {
    useAuthStore.getState().setAuthenticated(mockUser, 'test.jwt.token');
    useAuthStore.getState().setNetworkError();

    const state = useAuthStore.getState();
    expect(state.status).toBe('network_error');
    // User is preserved during temporary network failure
    expect(state.user).toEqual(mockUser);
  });
});
