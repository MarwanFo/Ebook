import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { PrismaService } from '../src/database/prisma.service';

describe('Security Hardening & Middleware (e2e)', () => {
  let app: INestApplication;

  const inMemoryPrisma: any = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(true),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(inMemoryPrisma)
      .compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      }),
    );
    app.use(cookieParser());
    app.use(new RequestIdMiddleware().use);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(moduleFixture.get(Reflector)),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    app.enableCors({
      origin: ['http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'Accept', 'Origin'],
      exposedHeaders: ['x-request-id'],
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets defensive Helmet security headers on all responses', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-download-options']).toBe('noopen');
    expect(res.headers['x-permitted-cross-domain-policies']).toBe('none');
  });

  it('preserves client-supplied X-Request-ID and echoes it in response headers', async () => {
    const clientRequestId = 'client-trace-123456';
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', clientRequestId)
      .expect(200);

    expect(res.headers['x-request-id']).toBe(clientRequestId);
  });

  it('generates a new UUID v4 for X-Request-ID if not supplied by client', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    const generatedId = res.headers['x-request-id'];
    expect(generatedId).toBeDefined();
    // Valid UUID pattern
    expect(generatedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('enforces CORS policies with allowed origin and exposed headers', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
