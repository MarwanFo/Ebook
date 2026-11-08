import {
  BookmarkDto,
  CreateBookmarkDto,
  LibraryStatsDto,
  UpdateBookmarkDto,
} from '@bookflow/shared-types';
import { request } from '../../../services/api-client';

export const bookmarksApi = {
  async getBookmarks(bookId: string): Promise<BookmarkDto[]> {
    return request<BookmarkDto[]>(`/reading/${bookId}/bookmarks`, {
      method: 'GET',
    });
  },

  async createBookmark(bookId: string, dto: CreateBookmarkDto): Promise<BookmarkDto> {
    return request<BookmarkDto>(`/reading/${bookId}/bookmarks`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updateBookmark(bookmarkId: string, dto: UpdateBookmarkDto): Promise<BookmarkDto> {
    return request<BookmarkDto>(`/reading/bookmarks/${bookmarkId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async deleteBookmark(bookmarkId: string): Promise<void> {
    return request<void>(`/reading/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
    });
  },

  async getLibraryStats(): Promise<LibraryStatsDto> {
    return request<LibraryStatsDto>('/reading/stats', {
      method: 'GET',
    });
  },
};
