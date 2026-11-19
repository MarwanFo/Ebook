import {
  AuthSessionDto,
  AuthTokensDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  MessageResponseDto,
  RegisterDto,
  ResetPasswordDto,
  UserProfileDto,
  VerifyEmailDto,
} from '@bookflow/shared-types';
import { request } from '../../../services/api-client';

export const authApi = {
  register: (dto: RegisterDto): Promise<AuthSessionDto> =>
    request<AuthSessionDto>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  login: (dto: LoginDto): Promise<AuthSessionDto> =>
    request<AuthSessionDto>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  refresh: (): Promise<AuthTokensDto> =>
    request<AuthTokensDto>('/auth/refresh', {
      method: 'POST',
    }),

  logout: (): Promise<MessageResponseDto> =>
    request<MessageResponseDto>('/auth/logout', {
      method: 'POST',
    }),

  getMe: (): Promise<{ user: UserProfileDto }> =>
    request<{ user: UserProfileDto }>('/auth/me', {
      method: 'GET',
    }),

  changePassword: (dto: ChangePasswordDto): Promise<MessageResponseDto> =>
    request<MessageResponseDto>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  forgotPassword: (dto: ForgotPasswordDto): Promise<MessageResponseDto> =>
    request<MessageResponseDto>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  resetPassword: (dto: ResetPasswordDto): Promise<MessageResponseDto> =>
    request<MessageResponseDto>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  verifyEmail: (payload: string | VerifyEmailDto): Promise<MessageResponseDto> =>
    request<MessageResponseDto>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(typeof payload === 'string' ? { token: payload } : payload),
    }),

  resendVerification: (email: string): Promise<MessageResponseDto> =>
    request<MessageResponseDto>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};
