import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';

@Injectable()
export class CookieService {
  private readonly isProduction: boolean;
  private readonly cookieName: string;
  private readonly maxAgeMs: number;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('env') === 'production';
    this.cookieName =
      this.configService.get<string>('cookie.refreshCookieName') ||
      (this.isProduction ? '__Host-bookflow_refresh' : 'bookflow_refresh');

    const expirationDays = this.configService.get<number>('cookie.refreshExpirationDays') || 7;
    this.maxAgeMs = expirationDays * 24 * 60 * 60 * 1000;
  }

  getCookieName(): string {
    return this.cookieName;
  }

  /**
   * Sets the refresh token cookie with strict security flags.
   * Path: / (required for __Host- prefix in production)
   */
  setRefreshCookie(res: Response, refreshToken: string): void {
    const options: CookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: this.maxAgeMs,
    };

    res.cookie(this.cookieName, refreshToken, options);
  }

  /**
   * Clears the refresh token cookie using exactly the same path, secure, and sameSite attributes.
   */
  clearRefreshCookie(res: Response): void {
    const options: CookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    };

    res.clearCookie(this.cookieName, options);
  }
}
