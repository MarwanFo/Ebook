import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BookDetailDto,
  BookFormat,
  BookStatus,
  BookSummaryDto,
  LibraryStatsDto,
  LocationType,
  PaginatedResponse,
} from '@bookflow/shared-types';
import { useUploadBook } from '../features/books/hooks/useUploadBook';
import { useDeleteBook } from '../features/books/hooks/useDeleteBook';
import { useUpdateBook } from '../features/books/hooks/useUpdateBook';
import { useCreateBookmark } from '../features/reading/hooks/useCreateBookmark';
import { useDeleteBookmark } from '../features/reading/hooks/useDeleteBookmark';
import { useUpdateProgress } from '../features/reading/hooks/useUpdateProgress';
import { booksApi } from '../features/books/services/books-api';
import { bookmarksApi } from '../features/reading/services/bookmarks-api';
import { readingApi } from '../features/reading/services/reading-api';

vi.mock('../features/books/services/books-api', () => ({
  booksApi: {
    uploadBook: vi.fn(),
    deleteBook: vi.fn(),
    updateBook: vi.fn(),
    getBooks: vi.fn(),
  },
}));

vi.mock('../features/reading/services/bookmarks-api', () => ({
  bookmarksApi: {
    createBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    getBookmarks: vi.fn(),
    getLibraryStats: vi.fn(),
  },
}));

vi.mock('../features/reading/services/reading-api', () => ({
  readingApi: {
    updateProgress: vi.fn(),
    getProgress: vi.fn(),
  },
}));

describe('Live State Synchronization', () => {
  let queryClient: QueryClient;

  const initialBooksData: PaginatedResponse<BookSummaryDto> = {
    data: [
      {
        id: 'book-1',
        ownerId: 'user-1',
        title: 'Initial Book',
        author: 'Author One',
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

  const initialStats: LibraryStatsDto = {
    totalBooks: 1,
    readingBooks: 0,
    completedBooks: 0,
    unreadBooks: 1,
    totalBookmarks: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Populate initial caches
    queryClient.setQueryData(['books', { page: 1, limit: 10 }], initialBooksData);
    queryClient.setQueryData(['library-stats'], initialStats);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useUploadBook instantly updates book list cache and increments stats counter', async () => {
    const uploadedBookDetail: BookDetailDto = {
      id: 'book-2',
      ownerId: 'user-1',
      title: 'Newly Uploaded Book',
      author: 'Author Two',
      format: BookFormat.PDF,
      status: BookStatus.UNREAD,
      hasCover: true,
      description: 'A great PDF book',
      language: 'en',
      publisher: 'Publisher',
      publishedAt: '2026-01-01',
      isbn: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: null,
    };

    vi.mocked(booksApi.uploadBook).mockResolvedValue({
      book: uploadedBookDetail,
      extractedMetadata: {
        title: 'Newly Uploaded Book',
        author: 'Author Two',
        description: null,
        language: null,
        publisher: null,
        publishedAt: null,
        isbn: null,
        hasCover: true,
      },
    });

    const { result } = renderHook(() => useUploadBook(), { wrapper });

    const dummyFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    await act(async () => {
      await result.current.mutateAsync(dummyFile);
    });

    // Check cached books list updated immediately without page refresh
    const cachedBooks = queryClient.getQueryData<PaginatedResponse<BookSummaryDto>>([
      'books',
      { page: 1, limit: 10 },
    ]);
    expect(cachedBooks?.data).toHaveLength(2);
    expect(cachedBooks?.data[0]?.id).toBe('book-2');
    expect(cachedBooks?.meta.pagination.total).toBe(2);

    // Check cached library stats updated immediately
    const cachedStats = queryClient.getQueryData<LibraryStatsDto>(['library-stats']);
    expect(cachedStats?.totalBooks).toBe(2);
    expect(cachedStats?.unreadBooks).toBe(2);
  });

  it('useDeleteBook optimistically removes book from cache and decrements stats counter', async () => {
    vi.mocked(booksApi.deleteBook).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteBook(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('book-1');
    });

    // Book should be eliminated from query cache immediately
    const cachedBooks = queryClient.getQueryData<PaginatedResponse<BookSummaryDto>>([
      'books',
      { page: 1, limit: 10 },
    ]);
    expect(cachedBooks?.data).toHaveLength(0);
    expect(cachedBooks?.meta.pagination.total).toBe(0);

    // Stats totalBooks decremented
    const cachedStats = queryClient.getQueryData<LibraryStatsDto>(['library-stats']);
    expect(cachedStats?.totalBooks).toBe(0);
  });

  it('useUpdateBook immediately updates book details in cache and triggers sync', async () => {
    const updatedBook: BookDetailDto = {
      id: 'book-1',
      ownerId: 'user-1',
      title: 'Updated Book Title',
      author: 'Author One',
      format: BookFormat.EPUB,
      status: BookStatus.READING,
      hasCover: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: null,
      description: null,
      language: null,
      publisher: null,
      publishedAt: null,
      isbn: null,
    };

    vi.mocked(booksApi.updateBook).mockResolvedValue(updatedBook);

    const { result } = renderHook(() => useUpdateBook('book-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Updated Book Title', status: BookStatus.READING });
    });

    const cachedBooks = queryClient.getQueryData<PaginatedResponse<BookSummaryDto>>([
      'books',
      { page: 1, limit: 10 },
    ]);
    expect(cachedBooks?.data[0]?.title).toBe('Updated Book Title');
    expect(cachedBooks?.data[0]?.status).toBe(BookStatus.READING);
  });

  it('useCreateBookmark and useDeleteBookmark update bookmarks and stats immediately', async () => {
    const newBookmark = {
      id: 'bmk-101',
      userId: 'user-1',
      bookId: 'book-1',
      locationType: LocationType.PDF_PAGE,
      locationValue: '42',
      progressPercentage: 50.0,
      title: 'Chapter 3',
      note: 'Interesting note',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(bookmarksApi.createBookmark).mockResolvedValue(newBookmark);
    vi.mocked(bookmarksApi.deleteBookmark).mockResolvedValue(undefined);

    const { result: createHook } = renderHook(() => useCreateBookmark('book-1'), { wrapper });

    await act(async () => {
      await createHook.current.mutateAsync({
        locationType: LocationType.PDF_PAGE,
        locationValue: '42',
        progressPercentage: 50.0,
        title: 'Chapter 3',
      });
    });

    // Check bookmarks cache
    const cachedBookmarks = queryClient.getQueryData<(typeof newBookmark)[]>([
      'bookmarks',
      'book-1',
    ]);
    expect(cachedBookmarks).toHaveLength(1);
    expect(cachedBookmarks?.[0]?.id).toBe('bmk-101');

    // Check stats totalBookmarks
    const cachedStatsAfterCreate = queryClient.getQueryData<LibraryStatsDto>(['library-stats']);
    expect(cachedStatsAfterCreate?.totalBookmarks).toBe(1);

    // Now delete the bookmark
    const { result: deleteHook } = renderHook(() => useDeleteBookmark('book-1'), { wrapper });

    await act(async () => {
      await deleteHook.current.mutateAsync('bmk-101');
    });

    const cachedBookmarksAfterDelete = queryClient.getQueryData<(typeof newBookmark)[]>([
      'bookmarks',
      'book-1',
    ]);
    expect(cachedBookmarksAfterDelete).toHaveLength(0);

    const cachedStatsAfterDelete = queryClient.getQueryData<LibraryStatsDto>(['library-stats']);
    expect(cachedStatsAfterDelete?.totalBookmarks).toBe(0);
  });

  it('useUpdateProgress immediately reflects status changes and updates book cache', async () => {
    const progressResponse = {
      id: 'prog-1',
      userId: 'user-1',
      bookId: 'book-1',
      locationType: LocationType.PDF_PAGE,
      locationValue: '100',
      progressPercentage: 100,
      currentPage: 100,
      totalPages: 100,
      settings: null,
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(readingApi.updateProgress).mockResolvedValue(progressResponse);

    const { result } = renderHook(() => useUpdateProgress('book-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        locationType: LocationType.PDF_PAGE,
        locationValue: '100',
        progressPercentage: 100,
      });
    });

    const cachedProgress = queryClient.getQueryData(['reading-progress', 'book-1']);
    expect(cachedProgress).toEqual(progressResponse);

    const cachedBooks = queryClient.getQueryData<PaginatedResponse<BookSummaryDto>>([
      'books',
      { page: 1, limit: 10 },
    ]);
    expect(cachedBooks?.data[0]?.status).toBe(BookStatus.COMPLETED);
  });
});
