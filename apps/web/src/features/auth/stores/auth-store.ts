import { create } from 'zustand';
import { UserProfileDto } from '@bookflow/shared-types';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'network_error';

export interface AuthState {
  user: UserProfileDto | null;
  accessToken: string | null;
  status: AuthStatus;
  setAuthenticated: (user: UserProfileDto, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: UserProfileDto) => void;
  setUnauthenticated: () => void;
  setNetworkError: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: 'initializing',

  setAuthenticated: (user, accessToken) =>
    set({
      user,
      accessToken,
      status: 'authenticated',
    }),

  setAccessToken: (accessToken) =>
    set({
      accessToken,
      status: 'authenticated',
    }),

  setUser: (user) =>
    set({
      user,
    }),

  setUnauthenticated: () =>
    set({
      user: null,
      accessToken: null,
      status: 'unauthenticated',
    }),

  setNetworkError: () =>
    set({
      status: 'network_error',
    }),

  clear: () =>
    set({
      user: null,
      accessToken: null,
      status: 'unauthenticated',
    }),
}));
