import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { Reflector } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { MAIL_SERVICE } from '../src/mail/mail.interface';
import { TestMailService } from '../src/mail/test-mail.service';

describe('Authentication & Session Hardening (e2e)', () => {
  let app: INestApplication;
  let testMailService: TestMailService;

  // In-memory relational state mock for PrismaService to guarantee 100% deterministic, Docker-independent testing
  const usersTable = new Map<string, any>();
  const refreshTokensTable = new Map<string, any>();
  const passwordResetTokensTable = new Map<string, any>();

  const inMemoryPrisma: any = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(true),

    $transaction: jest.fn(async (cb: any) => {
      return cb(inMemoryPrisma);
    }),

    user: {
      create: jest.fn(async ({ data }: any) => {
        const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const record = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        usersTable.set(id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return usersTable.get(where.id) || null;
        if (where.email) {
          for (const user of usersTable.values()) {
            if (user.email.toLowerCase() === where.email.toLowerCase()) {
              return user;
            }
          }
        }
        return null;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const user = usersTable.get(where.id);
        if (!user) throw new Error('User not found');
        const updated = { ...user, ...data, updatedAt: new Date() };
        usersTable.set(where.id, updated);
        return updated;
      }),
    },

    refreshToken: {
      create: jest.fn(async ({ data }: any) => {
        const id = `token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const record = {
          id,
          ...data,
          createdAt: new Date(),
          consumedAt: null,
          revokedAt: null,
          revocationReason: null,
        };
        refreshTokensTable.set(id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return refreshTokensTable.get(where.id) || null;
        if (where.tokenHash) {
          for (const t of refreshTokensTable.values()) {
            if (t.tokenHash === where.tokenHash) return t;
          }
        }
        return null;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const token = refreshTokensTable.get(where.id);
        if (!token) throw new Error('Token not found');
        const updated = { ...token, ...data };
        refreshTokensTable.set(where.id, updated);
        return updated;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const [id, token] of refreshTokensTable.entries()) {
          let match = true;
          if (where.id && token.id !== where.id) match = false;
          if (where.familyId && token.familyId !== where.familyId) match = false;
          if (where.userId && token.userId !== where.userId) match = false;
          if (where.consumedAt === null && token.consumedAt !== null) match = false;
          if (where.revokedAt === null && token.revokedAt !== null) match = false;
          if (where.expiresAt?.gt && token.expiresAt <= where.expiresAt.gt) match = false;

          if (match) {
            refreshTokensTable.set(id, { ...token, ...data });
            count++;
          }
        }
        return { count };
      }),
    },

    passwordResetToken: {
      create: jest.fn(async ({ data }: any) => {
        const id = `reset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const record = {
          id,
          ...data,
          createdAt: new Date(),
          isUsed: false,
          usedAt: null,
        };
        passwordResetTokensTable.set(id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where, include }: any) => {
        let record = null;
        if (where.id) record = passwordResetTokensTable.get(where.id) || null;
        if (where.tokenHash) {
          for (const r of passwordResetTokensTable.values()) {
            if (r.tokenHash === where.tokenHash) {
              record = r;
              break;
            }
          }
        }
        if (record && include?.user) {
          const user = usersTable.get(record.userId);
          return { ...record, user };
        }
        return record;
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        let count = 0;
        for (const [id, r] of passwordResetTokensTable.entries()) {
          if (where.userId && r.userId === where.userId && where.usedAt === null && !r.usedAt) {
            passwordResetTokensTable.delete(id);
            count++;
          }
        }
        return { count };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const record = passwordResetTokensTable.get(where.id);
        if (!record) throw new Error('Reset token not found');
        const updated = { ...record, ...data };
        passwordResetTokensTable.set(where.id, updated);
        return updated;
      }),
    },
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_minimum_32_characters_long';
    process.env.CORS_ORIGIN = 'http://localhost:5173';

    testMailService = new TestMailService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(inMemoryPrisma)
      .overrideProvider(MAIL_SERVICE)
      .useValue(testMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
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
  });

  afterAll(async () => {
    await app.close();
  });

  const webOrigin = 'http://localhost:5173';
  const testUser = {
    email: 'E2E_Reader@example.com',
    password: 'super-secure-passphrase-with-unicode-🌟-12345',
    displayName: 'E2E Reader',
  };

  let accessToken: string;
  let rawRefreshTokenCookie: string;

  describe('Registration & Passphrase Policy', () => {
    it('should reject passwords shorter than 15 characters (HTTP 400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'short@example.com',
          password: 'only-14-chars!',
          displayName: 'Shorty',
        })
        .expect(400);

      expect(response.body.code).toBe('BAD_REQUEST');
    });

    it('should register a new user, normalize email, issue access token and secure HttpOnly refresh cookie (HTTP 201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('e2e_reader@example.com');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(typeof response.body.data.accessToken).toBe('string');

      // Refresh cookie verification
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = (cookies as unknown as string[]).find((c: string) =>
        c.startsWith('bookflow_refresh='),
      );
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('Path=/');
      expect(refreshCookie).toContain('SameSite=Lax');

      accessToken = response.body.data.accessToken;
      rawRefreshTokenCookie = String(refreshCookie?.split(';')[0]);
    });

    it('should reject registration with existing email (HTTP 409 Conflict)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e_reader@example.com',
          password: 'another-valid-passphrase-12345',
          displayName: 'Duplicate',
        })
        .expect(409);

      expect(response.body.code).toBe('CONFLICT');
    });
  });

  describe('Login & Timing Hardening', () => {
    it('should login valid user with normalized email (HTTP 200)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: '  E2E_READER@EXAMPLE.COM  ',
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      accessToken = response.body.data.accessToken;

      const cookies = response.headers['set-cookie'];
      const refreshCookie = (cookies as unknown as string[]).find((c: string) =>
        c.startsWith('bookflow_refresh='),
      );
      rawRefreshTokenCookie = String(refreshCookie?.split(';')[0]);
    });

    it('should reject invalid password with generic 401 error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'completely-wrong-password-123',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid email address or password');
    });

    it('should reject unknown email with identical generic 401 error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost_user@example.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid email address or password');
    });
  });

  describe('Protected Route (/api/v1/auth/me)', () => {
    it('should reject request without Bearer token (HTTP 401)', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return user profile with valid Bearer token (HTTP 200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.user.email).toBe('e2e_reader@example.com');
      expect(response.body.data.user.displayName).toBe('E2E Reader');
    });
  });

  describe('CSRF Defense & Token Refresh Rotation', () => {
    it('should reject refresh request with missing Origin and Referer (HTTP 403 Forbidden)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [rawRefreshTokenCookie])
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('should reject refresh request with unauthorized Origin (HTTP 403 Forbidden)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Origin', 'http://malicious-attacker.com')
        .set('Cookie', [rawRefreshTokenCookie])
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('should rotate refresh token when valid Origin and Cookie are provided (HTTP 200)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Origin', webOrigin)
        .set('Cookie', [rawRefreshTokenCookie])
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      accessToken = response.body.data.accessToken;

      const cookies = response.headers['set-cookie'];
      const newRefreshCookie = (cookies as unknown as string[]).find((c: string) =>
        c.startsWith('bookflow_refresh='),
      );
      expect(newRefreshCookie).toBeDefined();

      // Store consumed cookie and new cookie
      const consumedCookie = rawRefreshTokenCookie;
      rawRefreshTokenCookie = String(newRefreshCookie?.split(';')[0]);

      // Simulate Replay Attack: Replaying the old (consumed) refresh token outside grace window
      // Fast forward consumed time by altering record in mock
      for (const token of refreshTokensTable.values()) {
        if (token.consumedAt) {
          token.consumedAt = new Date(Date.now() - 30000); // 30s ago (exceeding 15s grace period)
        }
      }

      const replayResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Origin', webOrigin)
        .set('Cookie', [consumedCookie])
        .expect(401);

      expect(replayResponse.body.message).toContain('Invalid or expired authentication session');

      // Verify that token family was invalidated: Even the new token is now revoked!
      const subsequentResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Origin', webOrigin)
        .set('Cookie', [rawRefreshTokenCookie])
        .expect(401);

      expect(subsequentResponse.body.message).toContain(
        'Invalid or expired authentication session',
      );
    });
  });

  describe('Forgot & Reset Password Flows', () => {
    it('should return identical generic 200 response for non-existent and existent emails (Anti-Enumeration)', async () => {
      const resNonExistent = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody_here@example.com' })
        .expect(200);

      const resExistent = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(resNonExistent.body.data.message).toEqual(resExistent.body.data.message);
      expect(resExistent.body.data.message).toContain('If your email address is registered');

      // Verify email was received by TestMailService
      const sent = testMailService.getSentEmails();
      expect(sent.length).toBeGreaterThan(0);
      const resetEmail = sent.find((e) => e.to === 'e2e_reader@example.com');
      expect(resetEmail).toBeDefined();
      expect(resetEmail?.text).toContain('/reset-password?token=');
    });

    it('should reset password using token from mail service and allow login with new password', async () => {
      const sent = testMailService.getSentEmails();
      const resetEmail = sent.find((e) => e.to === 'e2e_reader@example.com');
      const resetUrl = resetEmail?.text || '';
      const tokenMatch = resetUrl.match(/token=([a-f0-9]+)/);
      expect(tokenMatch).toBeDefined();
      const rawResetToken = tokenMatch![1];

      const newPassphrase = 'my-updated-super-secure-passphrase-2026';

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawResetToken,
          newPassword: newPassphrase,
        })
        .expect(200);

      // Now login with new password
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: newPassphrase,
        })
        .expect(200);

      expect(loginRes.body.data.accessToken).toBeDefined();
    });
  });

  describe('Logout', () => {
    it('should clear refresh cookie on logout (HTTP 200)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Origin', webOrigin)
        .set('Cookie', [rawRefreshTokenCookie])
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = (cookies as unknown as string[]).find((c: string) =>
        c.startsWith('bookflow_refresh='),
      );
      expect(refreshCookie).toContain('Max-Age=0');
    });
  });
});
