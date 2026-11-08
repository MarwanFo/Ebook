import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import AdmZip from 'adm-zip';
import cookieParser from 'cookie-parser';
import { PDFDocument } from 'pdf-lib';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { PrismaService } from '../src/database/prisma.service';

describe('Books Subsystem (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let testUserId: string;
  let testAccessToken: string;

  const usersTable = new Map<string, any>();
  const booksTable = new Map<string, any>();
  const bookFilesTable = new Map<string, any>();
  const readingProgressTable = new Map<string, any>();

  const inMemoryPrisma: any = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(true),

    $transaction: jest.fn(async (cb: any) => {
      return cb(inMemoryPrisma);
    }),

    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return usersTable.get(where.id) || null;
        if (where.email) {
          for (const user of usersTable.values()) {
            if (user.email.toLowerCase() === where.email.toLowerCase()) return user;
          }
        }
        return null;
      }),
    },

    book: {
      create: jest.fn(async ({ data }: any) => {
        const id = uuidv4();
        const record = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastOpenedAt: null,
          files: [],
        };
        booksTable.set(id, record);
        return record;
      }),

      findMany: jest.fn(async ({ where, skip = 0, take = 20 }: any) => {
        let results = Array.from(booksTable.values()).filter((b) => b.ownerId === where.ownerId);

        if (where.format) {
          results = results.filter((b) => b.format === where.format);
        }
        if (where.status) {
          results = results.filter((b) => b.status === where.status);
        }
        if (where.OR) {
          const search = where.OR[0].title.contains.toLowerCase();
          results = results.filter(
            (b) =>
              b.title.toLowerCase().includes(search) ||
              (b.author && b.author.toLowerCase().includes(search)),
          );
        }

        return results.slice(skip, skip + take);
      }),

      findFirst: jest.fn(async ({ where, include }: any) => {
        let match: any = null;
        for (const book of booksTable.values()) {
          if (book.id === where.id && book.ownerId === where.ownerId) {
            match = { ...book };
            break;
          }
        }
        if (match && include?.files) {
          match.files = Array.from(bookFilesTable.values()).filter((f) => f.bookId === match.id);
        }
        return match;
      }),

      count: jest.fn(async ({ where }: any) => {
        let results = Array.from(booksTable.values()).filter((b) => b.ownerId === where.ownerId);
        if (where.format) results = results.filter((b) => b.format === where.format);
        if (where.status) results = results.filter((b) => b.status === where.status);
        return results.length;
      }),

      update: jest.fn(async ({ where, data }: any) => {
        const book = booksTable.get(where.id);
        if (!book) throw new Error('Book not found');
        const updated = { ...book, ...data, updatedAt: new Date() };
        booksTable.set(where.id, updated);
        const files = Array.from(bookFilesTable.values()).filter((f) => f.bookId === book.id);
        return { ...updated, files };
      }),

      delete: jest.fn(async ({ where }: any) => {
        const book = booksTable.get(where.id);
        if (book) {
          booksTable.delete(where.id);
          for (const [fId, file] of bookFilesTable.entries()) {
            if (file.bookId === where.id) bookFilesTable.delete(fId);
          }
        }
        return book;
      }),
    },

    bookFile: {
      create: jest.fn(async ({ data }: any) => {
        const id = uuidv4();
        const record = { id, ...data, createdAt: new Date() };
        bookFilesTable.set(id, record);
        return record;
      }),
    },

    readingProgress: {
      create: jest.fn(async ({ data }: any) => {
        const id = uuidv4();
        const record = { id, ...data, updatedAt: new Date() };
        readingProgressTable.set(id, record);
        return record;
      }),
    },
  };

  const createMockEpub = (): Buffer => {
    const zip = new AdmZip();
    zip.addFile('mimetype', Buffer.from('application/epub+zip', 'utf8'));
    zip.addFile(
      'META-INF/container.xml',
      Buffer.from(
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
        'utf8',
      ),
    );
    const opfXml = `<?xml version="1.0" encoding="utf-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>E2E Test Novel</dc:title>
        <dc:creator>Alice Developer</dc:creator>
        <dc:description>A book for automated verification.</dc:description>
      </metadata>
      <manifest>
        <item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image" />
      </manifest>
    </package>`;
    zip.addFile('content.opf', Buffer.from(opfXml, 'utf8'));
    zip.addFile('cover.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));
    return zip.toBuffer();
  };

  const createMockPdf = async (): Promise<Buffer> => {
    const pdf = await PDFDocument.create();
    pdf.setTitle('E2E Handbook');
    pdf.setAuthor('Bob Engineer');
    pdf.addPage([300, 400]);
    pdf.addPage([300, 400]);
    const bytes = await pdf.save();
    return Buffer.from(bytes);
  };

  beforeAll(async () => {
    testUserId = 'u0000000-0000-0000-0000-000000000001';
    usersTable.set(testUserId, {
      id: testUserId,
      email: 'booktester@bookflow.local',
      role: 'USER',
      isActive: true,
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
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.use(new RequestIdMiddleware().use);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    testAccessToken = jwtService.sign(
      {
        sub: testUserId,
        email: 'booktester@bookflow.local',
        role: 'USER',
      },
      {
        secret: 'bookflow_dev_access_secret_key_minimum_32_characters_long',
        issuer: 'bookflow-api',
        audience: 'bookflow-client',
        expiresIn: '15m',
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/books/upload', () => {
    it('should reject unauthenticated upload requests with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/books/upload')
        .attach('file', createMockEpub(), 'test.epub');

      expect(response.status).toBe(401);
    });

    it('should reject non-book file formats with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/books/upload')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .attach('file', Buffer.from('console.log("bad script");'), 'malicious.js');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Unsupported file format');
    });

    it('should upload and parse an EPUB ebook successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/books/upload')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .attach('file', createMockEpub(), 'alice-novel.epub');

      expect(response.status).toBe(201);
      expect(response.body.data.book).toBeDefined();
      expect(response.body.data.book.title).toBe('E2E Test Novel');
      expect(response.body.data.book.author).toBe('Alice Developer');
      expect(response.body.data.book.format).toBe('EPUB');
      expect(response.body.data.book.hasCover).toBe(true);
      expect(response.body.data.extractedMetadata.title).toBe('E2E Test Novel');
    });

    it('should upload and parse a PDF document with page count successfully', async () => {
      const pdfBuffer = await createMockPdf();
      const response = await request(app.getHttpServer())
        .post('/api/v1/books/upload')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .attach('file', pdfBuffer, 'handbook.pdf');

      expect(response.status).toBe(201);
      expect(response.body.data.book.title).toBe('E2E Handbook');
      expect(response.body.data.book.author).toBe('Bob Engineer');
      expect(response.body.data.book.format).toBe('PDF');
      expect(response.body.data.extractedMetadata.pageCount).toBe(2);
    });
  });

  describe('GET /api/v1/books (Library catalog)', () => {
    it('should return paginated books list for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/books?page=1&limit=10')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.meta.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter library by format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/books?format=EPUB')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((b: any) => b.format === 'EPUB')).toBe(true);
    });

    it('should search library by title or author query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/books?search=Alice')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.some((b: any) => b.author === 'Alice Developer')).toBe(true);
    });
  });

  describe('GET, PATCH, and DELETE /api/v1/books/:id', () => {
    let uploadedBookId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/books/upload')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .attach('file', createMockEpub(), 'lifecycle.epub');
      uploadedBookId = res.body.data.book.id;
    });

    it('should get detailed book metadata by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/books/${uploadedBookId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(uploadedBookId);
      expect(response.body.data.file).toBeDefined();
    });

    it('should update book title and status via PATCH', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/books/${uploadedBookId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          title: 'Updated Novel Title',
          status: 'READING',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Novel Title');
      expect(response.body.data.status).toBe('READING');
    });

    it('should stream book file with HTTP 206 Partial Content when Range header is sent', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/books/${uploadedBookId}/file`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .set('Range', 'bytes=0-10');

      expect(response.status).toBe(206);
      expect(response.headers['content-range']).toMatch(/^bytes 0-10\//);
      expect(response.headers['content-length']).toBe('11');
    });

    it('should stream book cover image thumbnail', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/books/${uploadedBookId}/cover`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/jpeg');
      expect(response.headers['cache-control']).toContain('public');
    });

    it('should delete book cleanly and return 204 No Content', async () => {
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/v1/books/${uploadedBookId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(deleteRes.status).toBe(204);

      // Verify book is no longer found
      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/books/${uploadedBookId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
