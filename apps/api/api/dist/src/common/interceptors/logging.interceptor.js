"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let LoggingInterceptor = class LoggingInterceptor {
    logger = new common_1.Logger('HTTP');
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();
        const { method, originalUrl, id: requestId } = req;
        const startTime = Date.now();
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const durationMs = Date.now() - startTime;
                const statusCode = res.statusCode;
                const logPayload = {
                    requestId,
                    method,
                    path: originalUrl,
                    statusCode,
                    durationMs,
                    timestamp: new Date().toISOString(),
                };
                this.logger.log(JSON.stringify(logPayload));
            },
            error: (err) => {
                const durationMs = Date.now() - startTime;
                const statusCode = err.status || 500;
                const logPayload = {
                    requestId,
                    method,
                    path: originalUrl,
                    statusCode,
                    durationMs,
                    timestamp: new Date().toISOString(),
                    error: err.message,
                };
                this.logger.error(JSON.stringify(logPayload));
            },
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
