import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  HttpStatus,
  ArgumentsHost,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { REQUEST_ID_HEADER } from '../constants';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  const createMockHost = (requestId?: string) => {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    const request = {
      id: requestId || 'test-uuid-req-1234',
      headers: {
        [REQUEST_ID_HEADER]: requestId || 'test-uuid-req-1234',
      },
    };

    const response = {
      status: statusMock,
      json: jsonMock,
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    return { host, request, response, statusMock, jsonMock };
  };

  it('should format standard NotFoundException with stable SCREAMING_SNAKE_CASE code', () => {
    const { host, statusMock, jsonMock } = createMockHost('550e8400-e29b-41d4-a716-446655440000');
    const exception = new NotFoundException('Book with id 42 was not found');

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Book with id 42 was not found',
      requestId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('should format ServiceUnavailableException with stable SERVICE_UNAVAILABLE code', () => {
    const { host, statusMock, jsonMock } = createMockHost('req-db-down-001');
    const exception = new ServiceUnavailableException('Database connection check failed');

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Database connection check failed',
      requestId: 'req-db-down-001',
    });
  });

  it('should format validation errors into structured errors array', () => {
    const { host, statusMock, jsonMock } = createMockHost('req-val-fail-002');
    const exception = new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: ['email must be a valid email address', 'password must be longer than 8 characters'],
    });

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed for the request payload.',
      errors: [
        { field: 'email', message: 'email must be a valid email address' },
        {
          field: 'password',
          message: 'password must be longer than 8 characters',
        },
      ],
      requestId: 'req-val-fail-002',
    });
  });

  it('should format unexpected runtime errors as 500 INTERNAL_SERVER_ERROR', () => {
    const { host, statusMock, jsonMock } = createMockHost('req-fatal-999');
    const exception = new Error('Database disk full');

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        requestId: 'req-fatal-999',
      }),
    );
  });
});
