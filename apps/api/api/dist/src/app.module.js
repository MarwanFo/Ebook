"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = exports.SafeThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const configuration_1 = __importDefault(require("./config/configuration"));
const env_validation_1 = require("./config/env.validation");
const prisma_module_1 = require("./database/prisma.module");
const health_module_1 = require("./health/health.module");
const users_module_1 = require("./users/users.module");
const mail_module_1 = require("./mail/mail.module");
const auth_module_1 = require("./auth/auth.module");
const storage_module_1 = require("./storage/storage.module");
const books_module_1 = require("./books/books.module");
const reading_module_1 = require("./reading/reading.module");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const request_id_middleware_1 = require("./common/middleware/request-id.middleware");
let SafeThrottlerGuard = class SafeThrottlerGuard extends throttler_1.ThrottlerGuard {
    async getTracker(req) {
        return (req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers?.['x-real-ip'] ||
            req.ip ||
            req.socket?.remoteAddress ||
            '127.0.0.1');
    }
};
exports.SafeThrottlerGuard = SafeThrottlerGuard;
exports.SafeThrottlerGuard = SafeThrottlerGuard = __decorate([
    (0, common_1.Injectable)()
], SafeThrottlerGuard);
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_id_middleware_1.RequestIdMiddleware).forRoutes({ path: '*', method: common_1.RequestMethod.ALL });
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
                validate: env_validation_1.validate,
                envFilePath: ['.env', '../../.env'],
            }),
            prisma_module_1.PrismaModule,
            health_module_1.HealthModule,
            users_module_1.UsersModule,
            mail_module_1.MailModule,
            auth_module_1.AuthModule,
            storage_module_1.StorageModule,
            books_module_1.BooksModule,
            reading_module_1.ReadingModule,
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 120,
                },
            ]),
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: SafeThrottlerGuard,
            },
        ],
    })
], AppModule);
