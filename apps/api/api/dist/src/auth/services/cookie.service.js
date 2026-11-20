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
exports.CookieService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let CookieService = class CookieService {
    configService;
    isProduction;
    cookieName;
    maxAgeMs;
    constructor(configService) {
        this.configService = configService;
        this.isProduction = this.configService.get('env') === 'production';
        this.cookieName =
            this.configService.get('cookie.refreshCookieName') ||
                (this.isProduction ? '__Host-bookflow_refresh' : 'bookflow_refresh');
        const expirationDays = this.configService.get('cookie.refreshExpirationDays') || 7;
        this.maxAgeMs = expirationDays * 24 * 60 * 60 * 1000;
    }
    getCookieName() {
        return this.cookieName;
    }
    /**
     * Sets the refresh token cookie with strict security flags.
     * Path: / (required for __Host- prefix in production)
     */
    setRefreshCookie(res, refreshToken) {
        const options = {
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
    clearRefreshCookie(res) {
        const options = {
            httpOnly: true,
            secure: this.isProduction,
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        };
        res.clearCookie(this.cookieName, options);
    }
};
exports.CookieService = CookieService;
exports.CookieService = CookieService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CookieService);
