import { useMutation } from '@tanstack/react-query';
import { ForgotPasswordDto, MessageResponseDto } from '@bookflow/shared-types';
import { authApi } from '../services/auth-api';
import { ApiError } from '../../../services/api-client';

export function useForgotPassword() {
  return useMutation<MessageResponseDto, ApiError, ForgotPasswordDto>({
    mutationFn: (dto) => authApi.forgotPassword(dto),
  });
}

