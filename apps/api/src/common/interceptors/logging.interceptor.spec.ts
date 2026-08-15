import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { LoggingInterceptor, HttpRequestLog } from './logging.interceptor';

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

  it('should emit structured JSON logs for successful requests', async () => {
    const { context } = createMockContext({
      requestId: 'req-test-json-001',
      method: 'GET',
      originalUrl: '/api/v1/health',
      statusCode: 200,
    });

    let loggedMessage = '';
    jest.spyOn(Logger.prototype, 'log').mockImplementation((msg: string) => {
      loggedMessage = msg;
    });

    const callHandler: CallHandler = {
      handle: () => of({ status: 'ok' }),
    };

    const result$ = interceptor.intercept(context, callHandler);
    await lastValueFrom(result$);

    expect(loggedMessage).toBeDefined();
    const parsed: HttpRequestLog = JSON.parse(loggedMessage);
    expect(parsed).toEqual({
      requestId: 'req-test-json-001',
      method: 'GET',
      path: '/api/v1/health',
      statusCode: 200,
      durationMs: expect.any(Number),
      timestamp: expect.any(String),
    });
  });

  it('should emit structured JSON error logs for failed requests without leaking sensitive bodies', async () => {
    const { context } = createMockContext({
      requestId: 'req-test-err-json-002',
      method: 'POST',
      originalUrl: '/api/v1/auth/login',
      statusCode: 500,
    });

    let errorMessage = '';
    jest.spyOn(Logger.prototype, 'error').mockImplementation((msg: string) => {
      errorMessage = msg;
    });

    const callHandler: CallHandler = {
      handle: () =>
        throwError(
          () =>
            new Error('Internal database query failure') as Error & {
              status?: number;
            },
        ),
    };

    const result$ = interceptor.intercept(context, callHandler);

    await expect(lastValueFrom(result$)).rejects.toThrow('Internal database query failure');

    expect(errorMessage).toBeDefined();
    const parsed: HttpRequestLog = JSON.parse(errorMessage);
    expect(parsed).toEqual({
      requestId: 'req-test-err-json-002',
      method: 'POST',
      path: '/api/v1/auth/login',
      statusCode: 500,
      durationMs: expect.any(Number),
      timestamp: expect.any(String),
      error: 'Internal database query failure',
    });
  });
});
