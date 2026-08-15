import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  const createMockContext = (options: {
    requestId?: string;
    method?: string;
    originalUrl?: string;
    statusCode?: number;
  }) => {
    const request = {
      id: options.requestId || 'req-trace-log-1234',
      method: options.method || 'GET',
      originalUrl: options.originalUrl || '/api/v1/books',
    };
    const response = {
      statusCode: options.statusCode ?? 200,
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    return { context, request, response };
  };

  it('should log successful request with structured request ID', async () => {
    const { context } = createMockContext({
      requestId: 'req-test-success-001',
      method: 'POST',
      originalUrl: '/api/v1/auth/login',
      statusCode: 200,
    });

    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const callHandler: CallHandler = {
      handle: () => of({ success: true }),
    };

    const result$ = interceptor.intercept(context, callHandler);
    await lastValueFrom(result$);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('[req-test-success-001] POST /api/v1/auth/login 200'),
    );
  });

  it('should log failed request with structured request ID and error message', async () => {
    const { context } = createMockContext({
      requestId: 'req-test-err-002',
      method: 'GET',
      originalUrl: '/api/v1/ready',
      statusCode: 503,
    });

    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const callHandler: CallHandler = {
      handle: () =>
        throwError(
          () =>
            new Error('Database connection check failed') as Error & {
              status?: number;
            },
        ),
    };

    const result$ = interceptor.intercept(context, callHandler);

    await expect(lastValueFrom(result$)).rejects.toThrow('Database connection check failed');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[req-test-err-002] GET /api/v1/ready 500'),
    );
  });
});
