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
  const bookmarksTable = new Map<string, any>();

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
      count: jest.fn(async ({ where }: any) => {
        let count = 0;
        for (const b of booksTable.values()) {
          if (b.ownerId === where.ownerId) {
            if (!where.status || b.status === where.status) {
              count++;
            }
          }
        }
        return count;
      }),
    },

    bookmark: {
      findMany: jest.fn(async ({ where }: any) => {
        const results: any[] = [];
        for (const b of bookmarksTable.values()) {
          if (b.userId === where.userId && b.bookId === where.bookId) {
            results.push(b);
          }
        }
        return results.sort((a, b) => a.progressPercentage - b.progressPercentage);
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        const b = bookmarksTable.get(where.id);
        if (!b || b.userId !== where.userId) return null;
        return b;
      }),
      create: jest.fn(async ({ data }: any) => {
        const id = uuidv4();
        const record = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        bookmarksTable.set(id, record);
        return record;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const existing = bookmarksTable.get(where.id);
        if (!existing) return null;
        const updated = { ...existing, ...data, updatedAt: new Date() };
        bookmarksTable.set(where.id, updated);
        return updated;
      }),
      delete: jest.fn(async ({ where }: any) => {
        const existing = bookmarksTable.get(where.id);
        bookmarksTable.delete(where.id);
        return existing;
      }),
      count: jest.fn(async ({ where }: any) => {
        let count = 0;
        for (const b of bookmarksTable.values()) {
          if (b.userId === where.userId) count++;
        }
        return count;
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
    bookmarksTable.clear();
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

  describe('Bookmarks & Annotations E2E', () => {
    let bookId: string;

    beforeEach(() => {
      bookId = uuidv4();
      booksTable.set(bookId, {
        id: bookId,
        ownerId: testUserId,
        title: 'Bookmark Test Book',
        format: 'EPUB',
        status: 'READING',
      });
    });

    it('POST /reading/:bookId/bookmarks creates a new bookmark and GET returns it', async () => {
      const payload = {
        locationType: 'EPUB_CFI',
        locationValue: 'epubcfi(/6/14!/4)',
        progressPercentage: 35.5,
        title: 'Key Insight',
        note: 'Important concept for later',
      };

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/reading/${bookId}/bookmarks`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send(payload)
        .expect(201);

      expect(createRes.body.data.id).toBeDefined();
      expect(createRes.body.data.title).toBe('Key Insight');
      expect(createRes.body.data.note).toBe('Important concept for later');
      expect(createRes.body.data.progressPercentage).toBe(35.5);

      const bookmarkId = createRes.body.data.id;

      // GET bookmarks
      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/reading/${bookId}/bookmarks`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      expect(getRes.body.data).toHaveLength(1);
      expect(getRes.body.data[0].id).toBe(bookmarkId);

      // PATCH bookmark
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/reading/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ title: 'Updated Title', note: 'Updated note' })
        .expect(200);

      expect(patchRes.body.data.title).toBe('Updated Title');
      expect(patchRes.body.data.note).toBe('Updated note');

      // DELETE bookmark
      await request(app.getHttpServer())
        .delete(`/api/v1/reading/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(204);

      // Verify empty after deletion
      const getAfterDelete = await request(app.getHttpServer())
        .get(`/api/v1/reading/${bookId}/bookmarks`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      expect(getAfterDelete.body.data).toHaveLength(0);
    });

    it('prevents user from modifying or deleting another user bookmark', async () => {
      const payload = {
        locationType: 'EPUB_CFI',
        locationValue: 'epubcfi(/6/14!/4)',
        progressPercentage: 10.0,
        title: 'User 1 Note',
      };

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/reading/${bookId}/bookmarks`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send(payload)
        .expect(201);

      const bookmarkId = createRes.body.data.id;

      // Other user tries to update
      await request(app.getHttpServer())
        .patch(`/api/v1/reading/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ title: 'Hacked Title' })
        .expect(404);

      // Other user tries to delete
      await request(app.getHttpServer())
        .delete(`/api/v1/reading/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(404);
    });
  });

  describe('Library Stats E2E', () => {
    it('GET /reading/stats returns aggregate book counts and bookmark total', async () => {
      // Add books for test user
      const b1 = uuidv4();
      const b2 = uuidv4();
      const b3 = uuidv4();
      booksTable.set(b1, { id: b1, ownerId: testUserId, status: 'READING' });
      booksTable.set(b2, { id: b2, ownerId: testUserId, status: 'COMPLETED' });
      booksTable.set(b3, { id: b3, ownerId: testUserId, status: 'UNREAD' });

      // Add a bookmark for test user
      const bmkId = uuidv4();
      bookmarksTable.set(bmkId, {
        id: bmkId,
        userId: testUserId,
        bookId: b1,
        progressPercentage: 20,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/reading/stats')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      expect(res.body.data.totalBooks).toBe(3);
      expect(res.body.data.readingBooks).toBe(1);
      expect(res.body.data.completedBooks).toBe(1);
      expect(res.body.data.unreadBooks).toBe(1);
      expect(res.body.data.totalBookmarks).toBe(1);
    });
  });
});
