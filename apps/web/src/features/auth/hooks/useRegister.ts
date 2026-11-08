import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RegisterDto, AuthSessionDto } from '@bookflow/shared-types';
import { authApi } from '../services/auth-api';
import { useAuthStore } from '../stores/auth-store';
import { ApiError } from '../../../services/api-client';

export function useRegister() {
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  return useMutation<AuthSessionDto, ApiError, RegisterDto>({
    mutationFn: (dto) => authApi.register(dto),
    onSuccess: (data) => {
      setAuthenticated(data.user, data.accessToken);
      queryClient.clear();
    },
  });
}

