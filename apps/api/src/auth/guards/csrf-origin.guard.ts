import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CsrfOriginGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(private readonly configService: ConfigService) {
    const origin = this.configService.get<string>('cors.origin') || 'http://localhost:5173';
    this.allowedOrigins = new Set(
      origin
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Check Sec-Fetch-Site if provided by modern browsers
    const secFetchSite = request.headers['sec-fetch-site'];
    if (secFetchSite === 'cross-site') {
      throw new ForbiddenException('CSRF check failed: cross-site request forbidden.');
    }

    // 2. Validate Origin header
    const origin = request.headers['origin'];
    if (typeof origin === 'string') {
      if (this.allowedOrigins.has(origin)) {
        return true;
      }
      throw new ForbiddenException(`CSRF check failed: unapproved Origin '${origin}'.`);
    }

    // 3. Fallback to Referer header if Origin is not set
    const referer = request.headers['referer'];
    if (typeof referer === 'string') {
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = refererUrl.origin;
        if (this.allowedOrigins.has(refererOrigin)) {
          return true;
        }
        throw new ForbiddenException(
          `CSRF check failed: unapproved Referer origin '${refererOrigin}'.`,
        );
      } catch (error) {
        if (error instanceof ForbiddenException) throw error;
        throw new ForbiddenException('CSRF check failed: malformed Referer header.');
      }
    }

    throw new ForbiddenException('CSRF check failed: missing required Origin or Referer header.');
  }
}
