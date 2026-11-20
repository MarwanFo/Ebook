import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface HttpRequestLog {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  error?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl, id: requestId } = req;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = res.statusCode;
          const logPayload: HttpRequestLog = {
            requestId,
            method,
            path: originalUrl,
            statusCode,
            durationMs,
            timestamp: new Date().toISOString(),
          };
          this.logger.log(JSON.stringify(logPayload));
        },
        error: (err) => {
          const durationMs = Date.now() - startTime;
          const statusCode = err.status || 500;
          const logPayload: HttpRequestLog = {
            requestId,
            method,
            path: originalUrl,
            statusCode,
            durationMs,
            timestamp: new Date().toISOString(),
            error: err.message,
          };
          this.logger.error(JSON.stringify(logPayload));
        },
      }),
    );
  }
}
