import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BookFormat, BookStatus } from '@prisma/client';
import { BookFormat as SharedBookFormat } from '@bookflow/shared-types';
import { Readable } from 'stream';
import { PrismaService } from '../database/prisma.service';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.interface';
import { BooksService } from './books.service';
import { EpubParserService } from './parsers/epub-parser.service';
import { PdfParserService } from './parsers/pdf-parser.service';
import * as bookValidator from './utils/book-validator';

describe('BooksService', () => {
  let service: BooksService;
  let mockPrisma: any;
  let mockStorage: jest.Mocked<StorageService>;
  let mockEpubParser: jest.Mocked<EpubParserService>;
  let mockPdfParser: jest.Mocked<PdfParserService>;

  const mockUserId = 'user-uuid-1234';
  const mockBookId = 'book-uuid-5678';

  const mockDbBook = {
    id: mockBookId,
    ownerId: mockUserId,
    title: 'The Clean Coder',
    author: 'Robert C. Martin',
    description: 'A Code of Conduct for Professional Programmers',
    language: 'en',
    publisher: 'Prentice Hall',
    publishedAt: new Date('2011-05-13'),
    isbn: '9780137081073',
    format: BookFormat.EPUB,
    coverStorageKey: 'covers/user-uuid-1234/cover-1.jpg',
    status: BookStatus.UNREAD,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastOpenedAt: null,
    files: [
      {
        id: 'file-uuid-1',
        bookId: mockBookId,
        storageKey: 'books/user-uuid-1234/book-1.epub',
        originalFilename: 'clean-coder.epub',
        mimeType: 'application/epub+zip',
        sizeBytes: BigInt(1048576),
        checksum: 'abc123sha256',
        createdAt: new Date('2026-01-01'),
      },
    ],
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
      book: {
        create: jest.fn().mockResolvedValue(mockDbBook),
        findMany: jest.fn().mockResolvedValue([mockDbBook]),
        findFirst: jest.fn().mockResolvedValue(mockDbBook),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue(mockDbBook),
        delete: jest.fn().mockResolvedValue(mockDbBook),
      },
      bookFile: {
        create: jest.fn().mockResolvedValue(mockDbBook.files[0]),
      },
      readingProgress: {
        create: jest.fn().mockResolvedValue({ id: 'progress-1' }),
      },
    };

    mockStorage = {
      saveFile: jest.fn().mockImplementation(async (subDir, filename) => `${subDir}/${filename}`),
      getFileStream: jest.fn().mockResolvedValue(Readable.from(['mock-content'])),
      getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-content')),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      fileExists: jest.fn().mockResolvedValue(true),
      getFileSize: jest.fn().mockResolvedValue(1048576),
    };

    mockEpubParser = {
      parse: jest.fn().mockResolvedValue({
        metadata: {
          title: 'The Clean Coder',
          author: 'Robert C. Martin',
          description: 'A Code of Conduct for Professional Programmers',
          language: 'en',
          publisher: 'Prentice Hall',
          publishedAt: new Date('2011-05-13'),
          isbn: '9780137081073',
        },
        cover: {
          buffer: Buffer.from([0xff, 0xd8, 0xff]),
          mimeType: 'image/jpeg',
          extension: 'jpg',
        },
      }),
    } as any;

    mockPdfParser = {
      parse: jest.fn().mockResolvedValue({
        metadata: {
          title: 'PDF Book',
          author: 'PDF Author',
          description: null,
          language: null,
          publisher: null,
          publishedAt: null,
          isbn: null,
        },
        pageCount: 150,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: STORAGE_SERVICE, useValue: mockStorage },
        { provide: EpubParserService, useValue: mockEpubParser },
        { provide: PdfParserService, useValue: mockPdfParser },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'storage.maxFileSizeMb') return 100;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  describe('upload', () => {
    it('should successfully parse, store, and create a book record for EPUB', async () => {
      // Mock valid EPUB buffer
      const mockEpubBuffer = Buffer.from(
        'PK\x03\x04' + 'mimetypeapplication/epub+zip' + 'restofzip',
      );
      const mockFile = {
        buffer: mockEpubBuffer,
        originalname: 'clean-coder.epub',
      } as Express.Multer.File;

      // Spy on validator
      jest.spyOn(bookValidator, 'validateBookBuffer').mockReturnValue({
        format: SharedBookFormat.EPUB,
        mimeType: 'application/epub+zip',
        sizeBytes: mockEpubBuffer.length,
        checksum: 'hash123',
      });

      const result = await service.upload(mockUserId, mockFile);

      expect(result.book.id).toBe(mockBookId);
      expect(result.book.title).toBe('The Clean Coder');
      expect(result.extractedMetadata.author).toBe('Robert C. Martin');
      expect(result.extractedMetadata.hasCover).toBe(true);
      expect(mockStorage.saveFile).toHaveBeenCalledTimes(2); // book and cover
      expect(mockPrisma.book.create).toHaveBeenCalled();
      expect(mockPrisma.bookFile.create).toHaveBeenCalled();
    });

    it('should cleanup physical storage files if the database transaction fails', async () => {
      const mockEpubBuffer = Buffer.from('mock epub content');
      const mockFile = {
        buffer: mockEpubBuffer,
        originalname: 'fail.epub',
      } as Express.Multer.File;

      jest.spyOn(bookValidator, 'validateBookBuffer').mockReturnValue({
        format: SharedBookFormat.EPUB,
        mimeType: 'application/epub+zip',
        sizeBytes: mockEpubBuffer.length,
        checksum: 'hash123',
      });

      mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB Connection Timeout'));

      await expect(service.upload(mockUserId, mockFile)).rejects.toThrow('DB Connection Timeout');
      expect(mockStorage.deleteFile).toHaveBeenCalled();
    });

    it('should throw BadRequestException if file is missing or empty', async () => {
      await expect(
        service.upload(mockUserId, { buffer: Buffer.alloc(0) } as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated books list with metadata', async () => {
      const result = await service.findAll(mockUserId, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.pagination.total).toBe(1);
      expect(result.data[0]?.hasCover).toBe(true);
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: mockUserId },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should apply search filter for title or author', async () => {
      await service.findAll(mockUserId, { page: 1, limit: 10, search: 'Martin' });
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: mockUserId,
            OR: [
              { title: { contains: 'Martin', mode: 'insensitive' } },
              { author: { contains: 'Martin', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return book details when found', async () => {
      const book = await service.findOne(mockUserId, mockBookId);
      expect(book.id).toBe(mockBookId);
      expect(book.file?.originalFilename).toBe('clean-coder.epub');
    });

    it('should throw NotFoundException if book does not exist or belongs to another user', async () => {
      mockPrisma.book.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne(mockUserId, 'missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete physical files and cascade delete book from database', async () => {
      await service.delete(mockUserId, mockBookId);
      expect(mockStorage.deleteFile).toHaveBeenCalledWith('books/user-uuid-1234/book-1.epub');
      expect(mockStorage.deleteFile).toHaveBeenCalledWith('covers/user-uuid-1234/cover-1.jpg');
      expect(mockPrisma.book.delete).toHaveBeenCalledWith({ where: { id: mockBookId } });
    });
  });

  describe('streamBookFile', () => {
    it('should stream complete file when range header is absent (200 OK)', async () => {
      const result = await service.streamBookFile(mockUserId, mockBookId);
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Length']).toBe('1048576');
      expect(result.mimeType).toBe('application/epub+zip');
    });

    it('should stream partial content when byte range is requested (206 Partial Content)', async () => {
      const result = await service.streamBookFile(mockUserId, mockBookId, 'bytes=0-1023');
      expect(result.statusCode).toBe(206);
      expect(result.headers['Content-Range']).toBe('bytes 0-1023/1048576');
      expect(result.headers['Content-Length']).toBe('1024');
    });
  });

  describe('streamCover', () => {
    it('should stream cover image with appropriate MIME type', async () => {
      const result = await service.streamCover(mockUserId, mockBookId);
      expect(result.mimeType).toBe('image/jpeg');
      expect(mockStorage.getFileStream).toHaveBeenCalledWith(mockDbBook.coverStorageKey);
    });

    it('should throw NotFoundException if book has no cover', async () => {
      mockPrisma.book.findFirst.mockResolvedValueOnce({ ...mockDbBook, coverStorageKey: null });
      await expect(service.streamCover(mockUserId, mockBookId)).rejects.toThrow(NotFoundException);
    });
  });
});
