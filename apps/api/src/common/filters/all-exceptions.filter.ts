import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse, ApiErrorDetail } from '@bookflow/shared-types';
import { REQUEST_ID_HEADER } from '../constants';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      request.id || (request.headers[REQUEST_ID_HEADER] as string) || 'unknown-request-id';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred.';
    let errors: ApiErrorDetail[] | undefined = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        code = this.getStatusCodeName(statusCode);
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) || exception.message;
        const rawCode = (obj.error as string) || this.getStatusCodeName(statusCode);
        code = rawCode.toUpperCase().replace(/\s+/g, '_');

        // Handle class-validator error array
        if (Array.isArray(obj.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed for the request payload.';
          errors = (obj.message as string[]).map((msg) => {
            const parts = msg.split(' ');
            const field = parts[0];
            return {
              field,
              message: msg,
            };
          });
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${requestId}] Unhandled exception: ${exception.message}`,
        exception.stack,
      );
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    const errorBody: ApiErrorResponse = {
      statusCode,
      code,
      message,
      ...(errors && errors.length > 0 ? { errors } : {}),
      requestId,
    };

    response.status(statusCode).json(errorBody);
  }

  private getStatusCodeName(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'ERROR';
    }
  }
}
