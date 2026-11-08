import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CookieService } from './services/cookie.service';
import { UserRole } from '@bookflow/shared-types';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let cookieService: jest.Mocked<CookieService>;

  const mockProfile = {
    id: 'user-uuid-1',
    email: 'reader@example.com',
    displayName: 'Reader',
    avatarUrl: null,
    role: UserRole.USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as any;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      rotateRefreshToken: jest.fn(),
      logout: jest.fn(),
      changePassword: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    } as any;

    cookieService = {
      getCookieName: jest.fn().mockReturnValue('bookflow_refresh'),
      setRefreshCookie: jest.fn(),
      clearRefreshCookie: jest.fn(),
    } as any;

    controller = new AuthController(authService, cookieService);
  });

  describe('register', () => {
    it('should register user and set refresh cookie', async () => {
      authService.register.mockResolvedValue({
        session: {
          user: mockProfile,
          accessToken: 'jwt.token.here',
        },
        rawRefreshToken: 'raw-refresh-token',
      });

      const req = { headers: { 'user-agent': 'Chrome/Test' } } as any;
      const result = await controller.register(
        { email: 'reader@example.com', password: 'valid-password-15-chars', displayName: 'Reader' },
        '127.0.0.1',
        req,
        mockResponse,
      );

      expect(authService.register).toHaveBeenCalledWith(
        { email: 'reader@example.com', password: 'valid-password-15-chars', displayName: 'Reader' },
        '127.0.0.1',
        'Chrome/Test',
      );
      expect(cookieService.setRefreshCookie).toHaveBeenCalledWith(
        mockResponse,
        'raw-refresh-token',
      );
      expect(result).toEqual({
        user: mockProfile,
        accessToken: 'jwt.token.here',
      });
    });
  });

  describe('login', () => {
    it('should authenticate user and set refresh cookie', async () => {
      authService.login.mockResolvedValue({
        session: {
          user: mockProfile,
          accessToken: 'jwt.token.here',
        },
        rawRefreshToken: 'raw-refresh-token-login',
      });

      const req = { headers: { 'user-agent': 'Firefox/Test' } } as any;
      const result = await controller.login(
        { email: 'reader@example.com', password: 'valid-password-15-chars' },
        '127.0.0.1',
        req,
        mockResponse,
      );

      expect(authService.login).toHaveBeenCalledWith(
        { email: 'reader@example.com', password: 'valid-password-15-chars' },
        '127.0.0.1',
        'Firefox/Test',
      );
      expect(cookieService.setRefreshCookie).toHaveBeenCalledWith(
        mockResponse,
        'raw-refresh-token-login',
      );
      expect(result).toEqual({
        user: mockProfile,
        accessToken: 'jwt.token.here',
      });
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token and set new cookie', async () => {
      const req = {
        cookies: { bookflow_refresh: 'existing-cookie-token' },
        headers: { 'user-agent': 'Safari/Test' },
      } as any;

      authService.rotateRefreshToken.mockResolvedValue({
        accessToken: 'new.jwt.token',
        rawRefreshToken: 'new-cookie-token',
      });

      const result = await controller.refresh(req, mockResponse, '127.0.0.1');

      expect(authService.rotateRefreshToken).toHaveBeenCalledWith(
        'existing-cookie-token',
        '127.0.0.1',
        'Safari/Test',
      );
      expect(cookieService.setRefreshCookie).toHaveBeenCalledWith(mockResponse, 'new-cookie-token');
      expect(result).toEqual({ accessToken: 'new.jwt.token' });
    });

    it('should clear cookie when rotation fails and rethrow error', async () => {
      const req = {
        cookies: { bookflow_refresh: 'bad-cookie-token' },
        headers: {},
      } as any;

      authService.rotateRefreshToken.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.refresh(req, mockResponse, '127.0.0.1')).rejects.toThrow(
        'Invalid token',
      );
      expect(cookieService.clearRefreshCookie).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('logout', () => {
    it('should revoke token and clear cookie', async () => {
      const req = {
        cookies: { bookflow_refresh: 'token-to-revoke' },
      } as any;

      const result = await controller.logout(req, mockResponse);

      expect(authService.logout).toHaveBeenCalledWith('token-to-revoke');
      expect(cookieService.clearRefreshCookie).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual({ message: 'Logged out successfully.' });
    });
  });

  describe('getMe', () => {
    it('should return current authenticated user profile', async () => {
      const result = await controller.getMe(mockProfile);
      expect(result).toEqual({ user: mockProfile });
    });
  });

  describe('changePassword', () => {
    it('should change password and clear refresh cookie', async () => {
      authService.changePassword.mockResolvedValue({
        message: 'Password changed successfully',
      });

      const result = await controller.changePassword(
        'user-uuid-1',
        { currentPassword: 'old-password-15', newPassword: 'new-password-15-chars' },
        mockResponse,
      );

      expect(authService.changePassword).toHaveBeenCalledWith('user-uuid-1', {
        currentPassword: 'old-password-15',
        newPassword: 'new-password-15-chars',
      });
      expect(cookieService.clearRefreshCookie).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });

  describe('forgotPassword', () => {
    it('should delegate forgot password to auth service', async () => {
      authService.forgotPassword.mockResolvedValue({
        message: 'Instructions sent',
      });

      const result = await controller.forgotPassword({ email: 'reader@example.com' });
      expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'reader@example.com' });
      expect(result).toEqual({ message: 'Instructions sent' });
    });
  });

  describe('resetPassword', () => {
    it('should reset password, clear cookie, and return result', async () => {
      authService.resetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      });

      const result = await controller.resetPassword(
        { token: 'valid-reset-token', newPassword: 'new-password-15-chars' },
        mockResponse,
      );

      expect(authService.resetPassword).toHaveBeenCalledWith({
        token: 'valid-reset-token',
        newPassword: 'new-password-15-chars',
      });
      expect(cookieService.clearRefreshCookie).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual({ message: 'Password reset successfully' });
    });
  });
});
