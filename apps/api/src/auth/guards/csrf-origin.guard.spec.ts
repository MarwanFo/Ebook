import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CsrfOriginGuard } from './csrf-origin.guard';

describe('CsrfOriginGuard', () => {
  let guard: CsrfOriginGuard;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:5173,http://127.0.0.1:5173'),
    };
    guard = new CsrfOriginGuard(mockConfigService as ConfigService);
  });

  function createMockContext(headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow request with valid Origin matching allowlist', () => {
    const context = createMockContext({
      origin: 'http://localhost:5173',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow request with valid Referer origin matching allowlist when Origin header is omitted', () => {
    const context = createMockContext({
      referer: 'http://localhost:5173/auth/refresh',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject request with unapproved Origin header with 403 Forbidden', () => {
    const context = createMockContext({
      origin: 'http://evil-attacker.com',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject request with cross-site sec-fetch-site header', () => {
    const context = createMockContext({
      origin: 'http://localhost:5173',
      'sec-fetch-site': 'cross-site',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject request when both Origin and Referer are missing', () => {
    const context = createMockContext({});
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
