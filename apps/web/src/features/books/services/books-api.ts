import {
  BookDetailDto,
  BookQueryDto,
  BookSummaryDto,
  BookUploadResponseDto,
  ExploreBooksQueryDto,
  ExploreBooksResponseDto,
  ImportPublicBookDto,
  PaginatedResponse,
  UpdateBookDto,
} from '@bookflow/shared-types';
import { request } from '../../../services/api-client';
import { useAuthStore } from '../../auth/stores/auth-store';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '/api/v1'
    : 'http://localhost:3000/api/v1');

export const booksApi = {
  async getBooks(query: BookQueryDto = {}): Promise<PaginatedResponse<BookSummaryDto>> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.search) params.append('search', query.search);
    if (query.format) params.append('format', query.format);
    if (query.status) params.append('status', query.status);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);

    const queryString = params.toString();
    const endpoint = queryString ? `/books?${queryString}` : '/books';
    return request<PaginatedResponse<BookSummaryDto>>(endpoint, {
      method: 'GET',
    });
  },

  async getBook(id: string): Promise<BookDetailDto> {
    return request<BookDetailDto>(`/books/${id}`, {
      method: 'GET',
    });
  },

  async uploadBook(file: File): Promise<BookUploadResponseDto> {
    const formData = new FormData();
    formData.append('file', file);

    return request<BookUploadResponseDto>('/books/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async updateBook(id: string, dto: UpdateBookDto): Promise<BookDetailDto> {
    return request<BookDetailDto>(`/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async deleteBook(id: string): Promise<void> {
    return request<void>(`/books/${id}`, {
      method: 'DELETE',
    });
  },

  async exploreBooks(query: ExploreBooksQueryDto = {}): Promise<ExploreBooksResponseDto> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.search) params.append('search', query.search);
    if (query.topic) params.append('topic', query.topic);

    const qs = params.toString();
    const endpoint = qs ? `/books/explore?${qs}` : '/books/explore';
    return request<ExploreBooksResponseDto>(endpoint, {
      method: 'GET',
    });
  },

  async importPublicBook(dto: ImportPublicBookDto): Promise<BookUploadResponseDto> {
    return request<BookUploadResponseDto>('/books/import-public', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  getBookFileUrl(id: string): string {
    return `${API_BASE_URL}/books/${id}/file`;
  },

  getBookCoverUrl(id: string): string {
    return `${API_BASE_URL}/books/${id}/cover`;
  },

  async getBookFileArrayBuffer(id: string): Promise<ArrayBuffer> {
    let token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    let response = await fetch(`${API_BASE_URL}/books/${id}/file`, {
      credentials: 'include',
      headers,
    });

    if (response.status === 401) {
      try {
        const refreshed = await request<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
        });
        token = refreshed.accessToken;
        headers['Authorization'] = `Bearer ${token}`;
        response = await fetch(`${API_BASE_URL}/books/${id}/file`, {
          credentials: 'include',
          headers,
        });
      } catch {
        // Fall through to response.ok check
      }
    }

    if (!response.ok) {
      throw new Error(`Failed to load book content: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  },
};
