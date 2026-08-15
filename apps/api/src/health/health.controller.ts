import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckResponse, ReadinessCheckResponse } from '@bookflow/shared-types';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Operations')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Indicates whether the API server process is running. Does not depend on external services.',
  })
  @ApiResponse({
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
  })
  checkLiveness(): HealthCheckResponse {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime() * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks whether the API server and all required dependencies (PostgreSQL) are ready to accept traffic.',
  })
  @ApiResponse({
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
  })
  @ApiResponse({
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
  })
  async checkReadiness(): Promise<ReadinessCheckResponse> {
    const isDbConnected = await this.prisma.ping();

    if (!isDbConnected) {
      throw new ServiceUnavailableException('Database connection check failed');
    }

    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
