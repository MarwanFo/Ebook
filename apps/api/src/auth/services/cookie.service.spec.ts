import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CookieService } from './cookie.service';

describe('CookieService', () => {
  let mockResponse: {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };

  beforeEach(() => {
    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe('in development environment', () => {
    let service: CookieService;

    beforeEach(() => {
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'env') return 'development';
          if (key === 'cookie.refreshCookieName') return undefined;
          if (key === 'cookie.refreshExpirationDays') return 7;
          return null;
        }),
      } as unknown as ConfigService;

      service = new CookieService(configService);
    });

    it('should use non-prefixed cookie name in development', () => {
      expect(service.getCookieName()).toBe('bookflow_refresh');
    });

    it('should set refresh cookie without secure flag in development', () => {
      service.setRefreshCookie(mockResponse as unknown as Response, 'test-raw-token');

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'bookflow_refresh',
        'test-raw-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should clear refresh cookie with matching attributes', () => {
      service.clearRefreshCookie(mockResponse as unknown as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'bookflow_refresh',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        }),
      );
    });
  });

  describe('in production environment', () => {
    let service: CookieService;

    beforeEach(() => {
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'env') return 'production';
          if (key === 'cookie.refreshCookieName') return undefined;
          if (key === 'cookie.refreshExpirationDays') return 7;
          return null;
        }),
      } as unknown as ConfigService;

      service = new CookieService(configService);
    });

    it('should use __Host- prefix in production', () => {
      expect(service.getCookieName()).toBe('__Host-bookflow_refresh');
    });

    it('should set secure refresh cookie with path / in production', () => {
      service.setRefreshCookie(mockResponse as unknown as Response, 'prod-token');

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        '__Host-bookflow_refresh',
        'prod-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });

    it('should clear cookie with secure flag in production', () => {
      service.clearRefreshCookie(mockResponse as unknown as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        '__Host-bookflow_refresh',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        }),
      );
    });
  });
});
