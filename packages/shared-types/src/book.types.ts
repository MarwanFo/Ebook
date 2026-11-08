import { BookFormat, BookStatus } from './enums';

export interface BookFileSummaryDto {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BookSummaryDto {
  id: string;
  ownerId: string;
  title: string;
  author: string | null;
  format: BookFormat;
  status: BookStatus;
  hasCover: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
}

export interface BookDetailDto extends BookSummaryDto {
  description: string | null;
  language: string | null;
  publisher: string | null;
  publishedAt: string | null;
  isbn: string | null;
  file?: BookFileSummaryDto;
}

export interface CreateBookDto {
  title: string;
  author?: string;
  description?: string;
  language?: string;
  publisher?: string;
  publishedAt?: string;
  isbn?: string;
  format: BookFormat;
}

export interface UpdateBookDto {
  title?: string;
  author?: string;
  description?: string;
  language?: string;
  publisher?: string;
  publishedAt?: string;
  isbn?: string;
  status?: BookStatus;
}

export interface BookQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  format?: BookFormat;
  status?: BookStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastOpenedAt' | 'title' | 'author';
  sortOrder?: 'asc' | 'desc';
}

export interface BookUploadResponseDto {
  book: BookDetailDto;
  extractedMetadata: {
    title: string;
    author: string | null;
    description: string | null;
    language: string | null;
    publisher: string | null;
    publishedAt: string | null;
    isbn: string | null;
    pageCount?: number | null;
    hasCover: boolean;
  };
}
