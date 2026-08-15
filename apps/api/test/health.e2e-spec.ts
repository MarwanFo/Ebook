import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { validate as isValidUuid } from 'uuid';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('HealthController & Global Middleware (e2e)', () => {
  let app: INestApplication;
  let prismaMock: {
    $connect: jest.Mock;
    $disconnect: jest.Mock;
    ping: jest.Mock;
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_minimum_32_characters_long';

    prismaMock = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new TransformInterceptor(reflector));
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health (Liveness Probe & Request-ID Lifecycle)', () => {
    it('should return 200, generate UUID v4 request ID, and wrap data envelope', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

      const headerRequestId = response.headers['x-request-id'];
      expect(headerRequestId).toBeDefined();
      expect(isValidUuid(headerRequestId)).toBe(true);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual({
        status: 'ok',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should preserve valid incoming x-request-id in response headers', async () => {
      const customRequestId = 'c35a6396-8575-4d79-bb7d-a19e6eb20194';
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('x-request-id', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customRequestId);
    });

    it('should sanitize and replace invalid characters in incoming x-request-id', async () => {
      const maliciousHeader = '<script>alert("xss")</script>';
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('x-request-id', maliciousHeader)
        .expect(200);

      const returnedId = response.headers['x-request-id'];
      expect(returnedId).not.toBe(maliciousHeader);
      expect(isValidUuid(returnedId)).toBe(true);
    });

    it('should replace excessively long incoming x-request-id with valid UUID', async () => {
      const longHeader = 'a'.repeat(128);
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('x-request-id', longHeader)
        .expect(200);

      const returnedId = response.headers['x-request-id'];
      expect(returnedId).not.toBe(longHeader);
      expect(isValidUuid(returnedId)).toBe(true);
    });
  });

  describe('GET /api/v1/ready (Readiness Probe)', () => {
    it('should return 200 when database ping is successful via DI probe', async () => {
      prismaMock.ping.mockResolvedValueOnce(true);

      const response = await request(app.getHttpServer()).get('/api/v1/ready').expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual({
        status: 'ok',
        database: 'connected',
        timestamp: expect.any(String),
      });
    });

    it('should return 503 with standardized error response when database ping fails', async () => {
      prismaMock.ping.mockResolvedValueOnce(false);
      const customId = 'e2e-ready-failure-trace-001';

      const response = await request(app.getHttpServer())
        .get('/api/v1/ready')
        .set('x-request-id', customId)
        .expect(503);

      const headerId = response.headers['x-request-id'];
      expect(headerId).toBe(customId);

      expect(response.body).toEqual({
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection check failed',
        requestId: customId,
      });

      // Assert error body requestId matches response header
      expect(response.body.requestId).toBe(headerId);
    });
  });
});
