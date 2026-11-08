import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { authApi } from '../services/auth-api';
import { ApiError } from '../../../services/api-client';

export function useAuth() {
  const { user, accessToken, status, setAuthenticated, setUnauthenticated, setNetworkError } =
    useAuthStore();

  const bootstrap = useCallback(async () => {
    try {
      const tokens = await authApi.refresh();
      useAuthStore.getState().setAccessToken(tokens.accessToken);
      const meResult = await authApi.getMe();
      setAuthenticated(meResult.user, tokens.accessToken);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        setUnauthenticated();
      } else {
        // Network or 5xx server failure: set network_error without destroying credentials
        setNetworkError();
      }
    }
  }, [setAuthenticated, setUnauthenticated, setNetworkError]);

  useEffect(() => {
    if (status === 'initializing') {
      bootstrap();
    }
  }, [status, bootstrap]);

  return {
    user,
    accessToken,
    status,
    isAuthenticated: status === 'authenticated' && !!user,
    isLoading: status === 'initializing',
    isNetworkError: status === 'network_error',
    retryBootstrap: bootstrap,
  };
}
