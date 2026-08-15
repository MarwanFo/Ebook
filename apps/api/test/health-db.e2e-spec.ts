import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { Reflector } from '@nestjs/core';

describe('Real Database Readiness & Health (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let isDbAvailable = false;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure exact production pipeline including global prefix
    app.setGlobalPrefix('api/v1');

    const requestIdMiddleware = new RequestIdMiddleware();
    app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new TransformInterceptor(reflector));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    try {
      isDbAvailable = await prismaService.ping();
    } catch {
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (prismaService) {
      await prismaService.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/health should always return 200 without database dependency', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toEqual({
      data: {
        status: 'ok',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      },
    });
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/v1/ready should verify live PostgreSQL connectivity when available, or return standardized 503 when offline', async () => {
    if (isDbAvailable) {
      const response = await request(app.getHttpServer()).get('/api/v1/ready').expect(200);

      expect(response.body).toEqual({
        data: {
          status: 'ok',
          database: 'connected',
          timestamp: expect.any(String),
        },
      });
      expect(response.headers['x-request-id']).toBeDefined();
    } else {
      const response = await request(app.getHttpServer()).get('/api/v1/ready').expect(503);

      expect(response.body).toEqual({
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection check failed',
        requestId: expect.any(String),
      });
      expect(response.body.requestId).toBe(response.headers['x-request-id']);
    }
  });
});
