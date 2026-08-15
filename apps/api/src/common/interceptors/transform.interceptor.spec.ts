import { ExecutionContext, HttpStatus, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { Readable } from 'stream';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new TransformInterceptor(reflector);
  });

  const createMockContext = (options: {
    url?: string;
    statusCode?: number;
    headersSent?: boolean;
    isBypassed?: boolean;
  }) => {
    const request = {
      url: options.url || '/api/v1/test',
    };
    const response = {
      statusCode: options.statusCode ?? HttpStatus.OK,
      headersSent: options.headersSent ?? false,
    };

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options.isBypassed ?? false);

    return { context, request, response };
  };

  it('should wrap normal object response in data envelope', async () => {
    const { context } = createMockContext({});
    const callHandler: CallHandler = {
      handle: () => of({ name: 'Clean Code', pages: 464 }),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({
      data: { name: 'Clean Code', pages: 464 },
    });
  });

  it('should not double wrap response that already has data and meta', async () => {
    const { context } = createMockContext({});
    const preWrapped = {
      data: [{ id: '1', title: 'Book 1' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    const callHandler: CallHandler = {
      handle: () => of(preWrapped),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(preWrapped);
  });

  it('should pass through 204 No Content responses without wrapping', async () => {
    const { context } = createMockContext({
      statusCode: HttpStatus.NO_CONTENT,
    });
    const callHandler: CallHandler = {
      handle: () => of(undefined),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBeUndefined();
  });

  it('should pass through 302 Redirect responses without wrapping', async () => {
    const { context } = createMockContext({ statusCode: HttpStatus.FOUND });
    const callHandler: CallHandler = {
      handle: () => of(undefined),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBeUndefined();
  });

  it('should pass through Stream responses without wrapping', async () => {
    const { context } = createMockContext({});
    const stream = new Readable();
    stream.push('file-chunk');
    stream.push(null);

    const callHandler: CallHandler = {
      handle: () => of(stream),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBe(stream);
  });

  it('should pass through Buffer responses without wrapping', async () => {
    const { context } = createMockContext({});
    const buffer = Buffer.from('raw-binary-data');

    const callHandler: CallHandler = {
      handle: () => of(buffer),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBe(buffer);
  });

  it('should bypass Swagger documentation routes', async () => {
    const { context } = createMockContext({
      url: '/api/docs/swagger-ui-bundle.js',
    });
    const swaggerHtml = '<html>Swagger UI</html>';
    const callHandler: CallHandler = {
      handle: () => of(swaggerHtml),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBe(swaggerHtml);
  });

  it('should bypass when @BypassTransform decorator is applied', async () => {
    const { context } = createMockContext({ isBypassed: true });
    const rawPayload = { custom: 'raw-unwrapped' };
    const callHandler: CallHandler = {
      handle: () => of(rawPayload),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBe(rawPayload);
  });
});
