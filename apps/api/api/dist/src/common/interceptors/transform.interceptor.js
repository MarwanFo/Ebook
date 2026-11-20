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
exports.TransformInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const operators_1 = require("rxjs/operators");
const stream_1 = require("stream");
const constants_1 = require("../constants");
let TransformInterceptor = class TransformInterceptor {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const isBypassed = this.reflector.getAllAndOverride(constants_1.BYPASS_TRANSFORM_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        // If route explicitly bypassed or is Swagger docs, pass through
        if (isBypassed || (request.url && request.url.includes('/api/docs'))) {
            return next.handle();
        }
        return next.handle().pipe((0, operators_1.map)((data) => {
            // Handle 204 No Content, 3xx Redirects, or already finished responses
            const statusCode = response.statusCode;
            if (statusCode === common_1.HttpStatus.NO_CONTENT ||
                (statusCode >= 300 && statusCode < 400) ||
                response.headersSent) {
                return data;
            }
            // Handle Stream / Buffer / file download
            if (data instanceof stream_1.Stream || Buffer.isBuffer(data)) {
                return data;
            }
            // Avoid double-wrapping if the handler already returned an ApiResponse envelope
            if (data &&
                typeof data === 'object' &&
                'data' in data &&
                Object.keys(data).every((k) => k === 'data' || k === 'meta')) {
                return data;
            }
            return {
                data,
            };
        }));
    }
};
exports.TransformInterceptor = TransformInterceptor;
exports.TransformInterceptor = TransformInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], TransformInterceptor);
