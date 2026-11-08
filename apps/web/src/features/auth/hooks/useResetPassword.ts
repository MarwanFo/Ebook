import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResetPasswordDto, MessageResponseDto } from '@bookflow/shared-types';
import { authApi } from '../services/auth-api';
import { useAuthStore } from '../stores/auth-store';
import { ApiError } from '../../../services/api-client';

export function useResetPassword() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((state) => state.clear);

  return useMutation<MessageResponseDto, ApiError, ResetPasswordDto>({
    mutationFn: (dto) => authApi.resetPassword(dto),
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
  });
}
