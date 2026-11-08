import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationType } from '@bookflow/shared-types';
import { bookmarksApi } from '../features/reading/services/bookmarks-api';

describe('bookmarksApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getBookmarks should send GET request to /reading/:bookId/bookmarks', async () => {
    const mockBookmarks = [
      {
        id: 'bmk-1',
        userId: 'u-1',
        bookId: 'b-1',
        locationType: LocationType.EPUB_CFI,
        locationValue: 'epubcfi(/6/2!/4)',
        progressPercentage: 15.0,
        title: 'Quote',
        note: 'Some note',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: mockBookmarks }),
    });

    const result = await bookmarksApi.getBookmarks('b-1');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reading/b-1/bookmarks'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Quote');
  });

  it('createBookmark should send POST request with payload', async () => {
    const newBookmark = {
      id: 'bmk-new',
      userId: 'u-1',
      bookId: 'b-1',
      locationType: LocationType.PDF_PAGE,
      locationValue: '42',
      progressPercentage: 42.0,
      title: 'Page 42',
      note: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: newBookmark }),
    });

    const payload = {
      locationType: LocationType.PDF_PAGE,
      locationValue: '42',
      progressPercentage: 42.0,
      title: 'Page 42',
    };

    const result = await bookmarksApi.createBookmark('b-1', payload);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reading/b-1/bookmarks'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
    expect(result.id).toBe('bmk-new');
  });

  it('updateBookmark should send PATCH request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { id: 'bmk-1', title: 'New Title' } }),
    });

    const result = await bookmarksApi.updateBookmark('bmk-1', { title: 'New Title' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reading/bookmarks/bmk-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'New Title' }),
      }),
    );
    expect(result.title).toBe('New Title');
  });

  it('deleteBookmark should send DELETE request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      status: 204,
      json: async () => ({}),
    });

    await bookmarksApi.deleteBookmark('bmk-1');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reading/bookmarks/bmk-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('getLibraryStats should send GET request to /reading/stats', async () => {
    const mockStats = {
      totalBooks: 10,
      readingBooks: 2,
      completedBooks: 3,
      unreadBooks: 5,
      totalBookmarks: 7,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: mockStats }),
    });

    const result = await bookmarksApi.getLibraryStats();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reading/stats'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.totalBooks).toBe(10);
    expect(result.totalBookmarks).toBe(7);
  });
});
