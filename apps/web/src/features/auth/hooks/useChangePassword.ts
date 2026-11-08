import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChangePasswordDto, MessageResponseDto } from '@bookflow/shared-types';
import { authApi } from '../services/auth-api';
import { useAuthStore } from '../stores/auth-store';
import { ApiError } from '../../../services/api-client';

export function useChangePassword() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((state) => state.clear);

  return useMutation<MessageResponseDto, ApiError, ChangePasswordDto>({
    mutationFn: (dto) => authApi.changePassword(dto),
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
  });
}
