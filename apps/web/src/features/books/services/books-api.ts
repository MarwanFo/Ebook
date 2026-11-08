import {
  BookDetailDto,
  BookQueryDto,
  BookSummaryDto,
  BookUploadResponseDto,
  PaginatedResponse,
  UpdateBookDto,
} from '@bookflow/shared-types';
import { request } from '../../../services/api-client';
import { useAuthStore } from '../../auth/stores/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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

  getBookFileUrl(id: string): string {
    return `${API_BASE_URL}/books/${id}/file`;
  },

  getBookCoverUrl(id: string): string {
    return `${API_BASE_URL}/books/${id}/cover`;
  },

  async getBookFileArrayBuffer(id: string): Promise<ArrayBuffer> {
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/books/${id}/file`, {
      credentials: 'include',
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to load book content: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  },
};
