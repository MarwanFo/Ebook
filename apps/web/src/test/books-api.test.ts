import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookFormat, BookStatus } from '@bookflow/shared-types';
import { booksApi } from '../features/books/services/books-api';

describe('booksApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getBooks should construct query parameters and send GET request', async () => {
    const mockResponse = {
      data: [
        {
          id: 'b-1',
          ownerId: 'u-1',
          title: 'Clean Code',
          author: 'Robert Martin',
          format: BookFormat.EPUB,
          status: BookStatus.UNREAD,
          hasCover: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastOpenedAt: null,
        },
      ],
      meta: {
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: mockResponse }),
    });

    const result = await booksApi.getBooks({ page: 1, limit: 10, search: 'Clean' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/books?page=1&limit=10&search=Clean'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.title).toBe('Clean Code');
  });

  it('uploadBook should attach file to FormData and send multipart POST request', async () => {
    const mockFile = new File(['mock content'], 'sample.epub', { type: 'application/epub+zip' });
    const mockUploadResponse = {
      book: {
        id: 'b-10',
        title: 'Uploaded Title',
        format: BookFormat.EPUB,
      },
      extractedMetadata: {
        title: 'Uploaded Title',
        author: 'Author',
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: mockUploadResponse }),
    });

    const result = await booksApi.uploadBook(mockFile);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/books/upload'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
    expect(result.book.title).toBe('Uploaded Title');
  });

  it('deleteBook should send DELETE request to book endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });

    await booksApi.deleteBook('b-999');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/books/b-999'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
