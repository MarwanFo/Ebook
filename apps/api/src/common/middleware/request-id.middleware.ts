import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as isValidUuid } from 'uuid';
import { REQUEST_ID_HEADER } from '../constants';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers[REQUEST_ID_HEADER];
    const incomingId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    // Validate incoming ID format or generate a new UUID v4
    const requestId =
      incomingId &&
      typeof incomingId === 'string' &&
      (isValidUuid(incomingId) || /^[a-zA-Z0-9_-]{8,64}$/.test(incomingId))
        ? incomingId
        : uuidv4();

    req.id = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
