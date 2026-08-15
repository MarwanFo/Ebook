import { Request, Response } from 'express';
import { validate as isValidUuid } from 'uuid';
import { RequestIdMiddleware } from './request-id.middleware';
import { REQUEST_ID_HEADER } from '../constants';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let headers: Record<string, string>;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    headers = {};
    req = {
      headers: {},
    };
    res = {
      setHeader: jest.fn((key: string, value: string) => {
        headers[key.toLowerCase()] = value;
        return res as Response;
      }),
    };
    next = jest.fn();
  });

  it('should generate a valid UUID v4 when incoming x-request-id is missing', () => {
    middleware.use(req as Request, res as Response, next);

    expect(req.id).toBeDefined();
    expect(isValidUuid(req.id!)).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should preserve a valid incoming UUID v4', () => {
    const validUuid = 'c35a6396-8575-4d79-bb7d-a19e6eb20194';
    req.headers![REQUEST_ID_HEADER] = validUuid;

    middleware.use(req as Request, res as Response, next);

    expect(req.id).toBe(validUuid);
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, validUuid);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should preserve a valid incoming slug format (8-64 chars)', () => {
    const validSlug = 'client-session-trace-123456';
    req.headers![REQUEST_ID_HEADER] = validSlug;

    middleware.use(req as Request, res as Response, next);

    expect(req.id).toBe(validSlug);
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, validSlug);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should replace invalid characters with a new UUID v4', () => {
    const maliciousHeader = '<script>alert("xss")</script>';
    req.headers![REQUEST_ID_HEADER] = maliciousHeader;

    middleware.use(req as Request, res as Response, next);

    expect(req.id).not.toBe(maliciousHeader);
    expect(isValidUuid(req.id!)).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should replace excessively long header values (>64 chars) with a new UUID v4', () => {
    const longHeader = 'a'.repeat(100);
    req.headers![REQUEST_ID_HEADER] = longHeader;

    middleware.use(req as Request, res as Response, next);

    expect(req.id).not.toBe(longHeader);
    expect(isValidUuid(req.id!)).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should replace excessively short header values (<8 chars) with a new UUID v4', () => {
    const shortHeader = 'abc';
    req.headers![REQUEST_ID_HEADER] = shortHeader;

    middleware.use(req as Request, res as Response, next);

    expect(req.id).not.toBe(shortHeader);
    expect(isValidUuid(req.id!)).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
