"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../constants");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = request.id || request.headers[constants_1.REQUEST_ID_HEADER] || 'unknown-request-id';
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'INTERNAL_SERVER_ERROR';
        let message = 'An unexpected error occurred.';
        let errors = undefined;
        if (exception instanceof common_1.HttpException) {
            statusCode = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
                code = this.getStatusCodeName(statusCode);
            }
            else if (typeof res === 'object' && res !== null) {
                const obj = res;
                message = obj.message || exception.message;
                const rawCode = obj.error || this.getStatusCodeName(statusCode);
                code = rawCode.toUpperCase().replace(/\s+/g, '_');
                // Handle class-validator error array
                if (Array.isArray(obj.message)) {
                    code = 'VALIDATION_ERROR';
                    message = 'Validation failed for the request payload.';
                    errors = obj.message.map((msg) => {
                        const parts = msg.split(' ');
                        const field = parts[0];
                        return {
                            field,
                            message: msg,
                        };
                    });
                }
            }
        }
        else if (exception instanceof Error) {
            this.logger.error(`[${requestId}] Unhandled exception: ${exception.message}`, exception.stack);
            if (process.env.NODE_ENV !== 'production') {
                message = exception.message;
            }
        }
        const errorBody = {
            statusCode,
            code,
            message,
            ...(errors && errors.length > 0 ? { errors } : {}),
            requestId,
        };
        response.status(statusCode).json(errorBody);
    }
    getStatusCodeName(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return 'BAD_REQUEST';
            case common_1.HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED';
            case common_1.HttpStatus.FORBIDDEN:
                return 'FORBIDDEN';
            case common_1.HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case common_1.HttpStatus.CONFLICT:
                return 'CONFLICT';
            case common_1.HttpStatus.UNPROCESSABLE_ENTITY:
                return 'UNPROCESSABLE_ENTITY';
            case common_1.HttpStatus.SERVICE_UNAVAILABLE:
                return 'SERVICE_UNAVAILABLE';
            default:
                return 'ERROR';
        }
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
