import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoginDto, AuthSessionDto } from '@bookflow/shared-types';
import { authApi } from '../services/auth-api';
import { useAuthStore } from '../stores/auth-store';
import { ApiError } from '../../../services/api-client';

export function useLogin() {
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  return useMutation<AuthSessionDto, ApiError, LoginDto>({
    mutationFn: (dto) => authApi.login(dto),
    onSuccess: (data) => {
      setAuthenticated(data.user, data.accessToken);
      queryClient.clear();
    },
  });
}

