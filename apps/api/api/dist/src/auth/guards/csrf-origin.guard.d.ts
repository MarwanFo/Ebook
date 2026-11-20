import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class CsrfOriginGuard implements CanActivate {
    private readonly configService;
    private readonly allowedOrigins;
    constructor(configService: ConfigService);
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=csrf-origin.guard.d.ts.map