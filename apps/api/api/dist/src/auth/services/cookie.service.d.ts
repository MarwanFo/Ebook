import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
export declare class CookieService {
    private readonly configService;
    private readonly isProduction;
    private readonly cookieName;
    private readonly maxAgeMs;
    constructor(configService: ConfigService);
    getCookieName(): string;
    /**
     * Sets the refresh token cookie with strict security flags.
     * Path: / (required for __Host- prefix in production)
     */
    setRefreshCookie(res: Response, refreshToken: string): void;
    /**
     * Clears the refresh token cookie using exactly the same path, secure, and sameSite attributes.
     */
    clearRefreshCookie(res: Response): void;
}
//# sourceMappingURL=cookie.service.d.ts.map