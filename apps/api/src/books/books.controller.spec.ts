import { Test, TestingModule } from '@nestjs/testing';
import { BookFormat, BookStatus } from '@bookflow/shared-types';
import { PassThrough, Readable } from 'stream';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

describe('BooksController', () => {
  let controller: BooksController;
  let mockService: jest.Mocked<BooksService>;

  const mockUserId = 'user-uuid-1';
  const mockBookId = 'book-uuid-1';

  const mockBookDetail = {
    id: mockBookId,
    ownerId: mockUserId,
    title: 'Design Patterns',
    author: 'Gang of Four',
    description: 'Elements of Reusable Object-Oriented Software',
    language: 'en',
    publisher: 'Addison-Wesley',
    publishedAt: '1994-10-31T00:00:00.000Z',
    isbn: '9780201633610',
    format: BookFormat.EPUB,
    status: BookStatus.UNREAD,
    hasCover: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastOpenedAt: null,
  };

  beforeEach(async () => {
    mockService = {
      upload: jest.fn().mockResolvedValue({
        book: mockBookDetail,
        extractedMetadata: {
          title: 'Design Patterns',
          author: 'Gang of Four',
          description: null,
          language: 'en',
          publisher: null,
          publishedAt: null,
          isbn: null,
          hasCover: true,
        },
      }),
      findAll: jest.fn().mockResolvedValue({
        data: [mockBookDetail],
        meta: {
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      }),
      findOne: jest.fn().mockResolvedValue(mockBookDetail),
      update: jest.fn().mockResolvedValue({ ...mockBookDetail, title: 'Updated Title' }),
      delete: jest.fn().mockResolvedValue(undefined),
      streamBookFile: jest.fn().mockResolvedValue({
        stream: Readable.from(['mock book binary']),
        mimeType: 'application/epub+zip',
        filename: 'patterns.epub',
        statusCode: 200,
        headers: {
          'Content-Length': '16',
          'Accept-Ranges': 'bytes',
          'Content-Type': 'application/epub+zip',
        },
      }),
      streamCover: jest.fn().mockResolvedValue({
        stream: Readable.from(['mock cover binary']),
        mimeType: 'image/jpeg',
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: mockService }],
    }).compile();

    controller = module.get<BooksController>(BooksController);
  });

  it('should upload a book and delegate to service', async () => {
    const mockFile = { buffer: Buffer.from('content'), originalname: 'book.epub' } as any;
    const res = await controller.upload(mockUserId, mockFile);
    expect(mockService.upload).toHaveBeenCalledWith(mockUserId, mockFile);
    expect(res.book.title).toBe('Design Patterns');
  });

  it('should get paginated library books', async () => {
    const res = await controller.findAll(mockUserId, { page: 1, limit: 10 });
    expect(mockService.findAll).toHaveBeenCalledWith(mockUserId, { page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
  });

  it('should get single book by id', async () => {
    const res = await controller.findOne(mockUserId, mockBookId);
    expect(mockService.findOne).toHaveBeenCalledWith(mockUserId, mockBookId);
    expect(res.id).toBe(mockBookId);
  });

  it('should update book metadata', async () => {
    const res = await controller.update(mockUserId, mockBookId, { title: 'Updated Title' });
    expect(mockService.update).toHaveBeenCalledWith(mockUserId, mockBookId, {
      title: 'Updated Title',
    });
    expect(res.title).toBe('Updated Title');
  });

  it('should delete book', async () => {
    await controller.delete(mockUserId, mockBookId);
    expect(mockService.delete).toHaveBeenCalledWith(mockUserId, mockBookId);
  });

  it('should stream book file and configure response headers', async () => {
    const mockRes = new PassThrough() as any;
    mockRes.status = jest.fn().mockReturnThis();
    mockRes.setHeader = jest.fn().mockReturnThis();

    await controller.streamFile(mockUserId, mockBookId, undefined, mockRes);
    expect(mockService.streamBookFile).toHaveBeenCalledWith(mockUserId, mockBookId, undefined);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', '16');
  });

  it('should stream cover image and configure cache headers', async () => {
    const mockRes = new PassThrough() as any;
    mockRes.setHeader = jest.fn().mockReturnThis();

    await controller.streamCover(mockUserId, mockBookId, mockRes);
    expect(mockService.streamCover).toHaveBeenCalledWith(mockUserId, mockBookId);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      expect.stringContaining('public'),
    );
  });
});
