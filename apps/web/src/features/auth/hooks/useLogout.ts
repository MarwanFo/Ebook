import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageResponseDto } from '@bookflow/shared-types';
import { authApi } from '../services/auth-api';
import { useAuthStore } from '../stores/auth-store';

export function useLogout() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((state) => state.clear);

  return useMutation<MessageResponseDto, Error, void>({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}

