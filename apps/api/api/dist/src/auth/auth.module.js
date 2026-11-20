"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const throttler_1 = require("@nestjs/throttler");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const password_hasher_service_1 = require("./services/password-hasher.service");
const cookie_service_1 = require("./services/cookie.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const csrf_origin_guard_1 = require("./guards/csrf-origin.guard");
const prisma_module_1 = require("../database/prisma.module");
const users_module_1 = require("../users/users.module");
const mail_module_1 = require("../mail/mail.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            mail_module_1.MailModule,
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('jwt.accessSecret') || 'default_secret_min_32_characters_here',
                    signOptions: {
                        expiresIn: configService.get('jwt.accessExpiresIn') || '30d',
                        issuer: configService.get('jwt.issuer') || 'bookflow-api',
                        audience: configService.get('jwt.audience') || 'bookflow-client',
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                useFactory: () => [
                    {
                        ttl: 60000,
                        limit: 60,
                    },
                ],
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            password_hasher_service_1.PasswordHasherService,
            cookie_service_1.CookieService,
            jwt_strategy_1.JwtStrategy,
            jwt_auth_guard_1.JwtAuthGuard,
            csrf_origin_guard_1.CsrfOriginGuard,
        ],
        exports: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard, cookie_service_1.CookieService, password_hasher_service_1.PasswordHasherService, jwt_1.JwtModule],
    })
], AuthModule);
