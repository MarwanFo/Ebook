import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { PrismaService } from '../src/database/prisma.service';

describe('Reading Progress Subsystem (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let testUserId: string;
  let testAccessToken: string;
  let otherUserId: string;
  let otherAccessToken: string;

  const usersTable = new Map<string, any>();
  const booksTable = new Map<string, any>();
  const readingProgressTable = new Map<string, any>();

  const inMemoryPrisma: any = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(true),

    $transaction: jest.fn(async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg(inMemoryPrisma);
    }),

    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return usersTable.get(where.id) || null;
        return null;
      }),
    },

    book: {
      findFirst: jest.fn(async ({ where }: any) => {
        const book = booksTable.get(where.id);
        if (!book || book.ownerId !== where.ownerId) return null;
        return book;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const existing = booksTable.get(where.id);
        if (!existing) return null;
        const updated = { ...existing, ...data, updatedAt: new Date() };
        booksTable.set(where.id, updated);
        return updated;
      }),
    },

    readingProgress: {
      findUnique: jest.fn(async ({ where }: any) => {
        const key = `${where.userId_bookId.userId}:${where.userId_bookId.bookId}`;
        return readingProgressTable.get(key) || null;
      }),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const key = `${where.userId_bookId.userId}:${where.userId_bookId.bookId}`;
        const existing = readingProgressTable.get(key);
        let record: any;
        if (existing) {
          record = {
            ...existing,
            ...update,
            updatedAt: new Date(),
          };
        } else {
          record = {
            id: uuidv4(),
            ...create,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        readingProgressTable.set(key, record);
        return record;
      }),
    },
  };

  beforeAll(async () => {
    testUserId = uuidv4();
    otherUserId = uuidv4();

    usersTable.set(testUserId, {
      id: testUserId,
      email: 'reader@bookflow.dev',
      displayName: 'Reader User',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    usersTable.set(otherUserId, {
      id: otherUserId,
      email: 'other@bookflow.dev',
      displayName: 'Other User',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(inMemoryPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);

    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.use(new RequestIdMiddleware().use);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();

    testAccessToken = jwtService.sign(
      { sub: testUserId, email: 'reader@bookflow.dev' },
      {
        secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-minimum-32-characters-required',
        expiresIn: '15m',
      },
    );

    otherAccessToken = jwtService.sign(
      { sub: otherUserId, email: 'other@bookflow.dev' },
      {
        secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-minimum-32-characters-required',
        expiresIn: '15m',
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    booksTable.clear();
    readingProgressTable.clear();
  });

  it('GET /reading/:bookId/progress requires authentication', async () => {
    const bookId = uuidv4();
    await request(app.getHttpServer()).get(`/api/v1/reading/${bookId}/progress`).expect(401);
  });

  it('GET /reading/:bookId/progress returns 404 if book does not belong to user', async () => {
    const foreignBookId = uuidv4();
    booksTable.set(foreignBookId, {
      id: foreignBookId,
      ownerId: otherUserId,
      title: 'Secret Book',
      format: 'EPUB',
      status: 'UNREAD',
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/reading/${foreignBookId}/progress`)
      .set('Authorization', `Bearer ${testAccessToken}`)
      .expect(404);

    expect(res.body.statusCode).toBe(404);

    // Other user who owns the book CAN access it
    const authorizedRes = await request(app.getHttpServer())
      .get(`/api/v1/reading/${foreignBookId}/progress`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(200);

    expect(authorizedRes.body.data).toBeNull();
  });

  it('GET /reading/:bookId/progress returns null data when no progress exists yet', async () => {
    const bookId = uuidv4();
    booksTable.set(bookId, {
      id: bookId,
      ownerId: testUserId,
      title: 'My EPUB Book',
      format: 'EPUB',
      status: 'UNREAD',
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/reading/${bookId}/progress`)
      .set('Authorization', `Bearer ${testAccessToken}`)
      .expect(200);

    expect(res.body.data).toBeNull();
  });

  it('PUT /reading/:bookId/progress updates progress and marks book READING', async () => {
    const bookId = uuidv4();
    booksTable.set(bookId, {
      id: bookId,
      ownerId: testUserId,
      title: 'My EPUB Book',
      format: 'EPUB',
      status: 'UNREAD',
      lastOpenedAt: null,
    });

    const updatePayload = {
      locationType: 'EPUB_CFI',
      locationValue: 'epubcfi(/6/4[chap01]!/4/2/10/1:0)',
      progressPercentage: 42.5,
      currentPage: 15,
      totalPages: 100,
      settings: { fontSize: 18, theme: 'sepia' },
    };

    const res = await request(app.getHttpServer())
      .put(`/api/v1/reading/${bookId}/progress`)
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send(updatePayload)
      .expect(200);

    expect(res.body.data.bookId).toBe(bookId);
    expect(res.body.data.locationType).toBe('EPUB_CFI');
    expect(res.body.data.locationValue).toBe('epubcfi(/6/4[chap01]!/4/2/10/1:0)');
    expect(res.body.data.progressPercentage).toBe(42.5);

    // Verify book status was updated in DB
    const updatedBook = booksTable.get(bookId);
    expect(updatedBook.status).toBe('READING');
    expect(updatedBook.lastOpenedAt).toBeInstanceOf(Date);
  });

  it('PUT /reading/:bookId/progress marks book COMPLETED when progress reaches 100%', async () => {
    const bookId = uuidv4();
    booksTable.set(bookId, {
      id: bookId,
      ownerId: testUserId,
      title: 'Finished Book',
      format: 'EPUB',
      status: 'READING',
    });

    const updatePayload = {
      locationType: 'EPUB_CFI',
      locationValue: 'epubcfi(/6/12[end]!/4/2)',
      progressPercentage: 100,
      currentPage: 100,
      totalPages: 100,
    };

    const res = await request(app.getHttpServer())
      .put(`/api/v1/reading/${bookId}/progress`)
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send(updatePayload)
      .expect(200);

    expect(res.body.data.progressPercentage).toBe(100);

    const updatedBook = booksTable.get(bookId);
    expect(updatedBook.status).toBe('COMPLETED');
  });
});
