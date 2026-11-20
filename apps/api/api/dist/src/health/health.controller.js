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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const prisma_service_1 = require("../database/prisma.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
let HealthController = class HealthController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    checkLiveness() {
        return {
            status: 'ok',
            uptime: Math.round(process.uptime() * 100) / 100,
            timestamp: new Date().toISOString(),
        };
    }
    async checkReadiness() {
        const isDbConnected = await this.prisma.ping();
        if (!isDbConnected) {
            throw new common_1.ServiceUnavailableException('Database connection check failed');
        }
        return {
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({
        summary: 'Liveness probe',
        description: 'Indicates whether the API server process is running. Does not depend on external services.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Server is alive',
        schema: {
            example: {
                data: {
                    status: 'ok',
                    uptime: 12.34,
                    timestamp: '2026-08-14T20:00:00.000Z',
                },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "checkLiveness", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('ready'),
    (0, swagger_1.ApiOperation)({
        summary: 'Readiness probe',
        description: 'Checks whether the API server and all required dependencies (PostgreSQL) are ready to accept traffic.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Server and dependencies are healthy',
        schema: {
            example: {
                data: {
                    status: 'ok',
                    database: 'connected',
                    timestamp: '2026-08-14T20:00:00.000Z',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: 'One or more critical dependencies are unavailable',
        schema: {
            example: {
                statusCode: 503,
                code: 'SERVICE_UNAVAILABLE',
                message: 'Database connection check failed',
                requestId: 'c4e34151-57c2-4876-be1f-13fb8f6cbb73',
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "checkReadiness", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('Operations'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HealthController);
