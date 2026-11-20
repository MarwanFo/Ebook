import { HealthCheckResponse, ReadinessCheckResponse } from '@bookflow/shared-types';
import { PrismaService } from '../database/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    checkLiveness(): HealthCheckResponse;
    checkReadiness(): Promise<ReadinessCheckResponse>;
}
//# sourceMappingURL=health.controller.d.ts.map