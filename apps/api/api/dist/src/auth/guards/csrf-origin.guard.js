"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsrfOriginGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let CsrfOriginGuard = class CsrfOriginGuard {
    configService;
    allowedOrigins;
    constructor(configService) {
        this.configService = configService;
        const origin = this.configService.get('cors.origin') || 'http://localhost:5173';
        this.allowedOrigins = new Set(origin
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean));
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        // 1. Check Sec-Fetch-Site if provided by modern browsers
        const secFetchSite = request.headers['sec-fetch-site'];
        if (secFetchSite === 'cross-site') {
            throw new common_1.ForbiddenException('CSRF check failed: cross-site request forbidden.');
        }
        // 2. Validate Origin header
        const origin = request.headers['origin'];
        if (typeof origin === 'string') {
            if (this.allowedOrigins.has(origin)) {
                return true;
            }
            throw new common_1.ForbiddenException(`CSRF check failed: unapproved Origin '${origin}'.`);
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
                throw new common_1.ForbiddenException(`CSRF check failed: unapproved Referer origin '${refererOrigin}'.`);
            }
            catch (error) {
                if (error instanceof common_1.ForbiddenException)
                    throw error;
                throw new common_1.ForbiddenException('CSRF check failed: malformed Referer header.');
            }
        }
        throw new common_1.ForbiddenException('CSRF check failed: missing required Origin or Referer header.');
    }
};
exports.CsrfOriginGuard = CsrfOriginGuard;
exports.CsrfOriginGuard = CsrfOriginGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CsrfOriginGuard);
