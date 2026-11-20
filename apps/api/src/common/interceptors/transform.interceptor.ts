import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response, Request } from 'express';
import { Stream } from 'stream';
import { ApiResponse } from '@bookflow/shared-types';
import { BYPASS_TRANSFORM_KEY } from '../constants';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T> {
    const isBypassed = this.reflector.getAllAndOverride<boolean>(BYPASS_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If route explicitly bypassed or is Swagger docs, pass through
    if (isBypassed || (request.url && request.url.includes('/api/docs'))) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // Handle 204 No Content, 3xx Redirects, or already finished responses
        const statusCode = response.statusCode;
        if (
          statusCode === HttpStatus.NO_CONTENT ||
          (statusCode >= 300 && statusCode < 400) ||
          response.headersSent
        ) {
          return data;
        }

        // Handle Stream / Buffer / file download
        if (data instanceof Stream || Buffer.isBuffer(data)) {
          return data;
        }

        // Avoid double-wrapping if the handler already returned an ApiResponse envelope
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          Object.keys(data).every((k) => k === 'data' || k === 'meta')
        ) {
          return data as ApiResponse<T>;
        }

        return {
          data,
        };
      }),
    );
  }
}
