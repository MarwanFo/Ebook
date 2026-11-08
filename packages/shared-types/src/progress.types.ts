import { LocationType } from './enums';

export interface ReaderSettingsDto {
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  theme?: string;
  layout?: string;
  zoom?: number;
  [key: string]: unknown;
}

export interface ReadingProgressDto {
  id: string;
  userId: string;
  bookId: string;
  locationType: LocationType;
  locationValue: string;
  progressPercentage: number;
  currentPage?: number | null;
  totalPages?: number | null;
  settings?: ReaderSettingsDto | null;
  updatedAt: string;
}

export interface UpdateProgressDto {
  locationType: LocationType;
  locationValue: string;
  progressPercentage: number;
  currentPage?: number;
  totalPages?: number;
  settings?: ReaderSettingsDto;
}

export interface BookmarkDto {
  id: string;
  userId: string;
  bookId: string;
  locationType: LocationType;
  locationValue: string;
  progressPercentage: number;
  title: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookmarkDto {
  locationType: LocationType;
  locationValue: string;
  progressPercentage: number;
  title?: string;
  note?: string;
}

export interface UpdateBookmarkDto {
  title?: string;
  note?: string;
}

export interface LibraryStatsDto {
  totalBooks: number;
  readingBooks: number;
  completedBooks: number;
  unreadBooks: number;
  totalBookmarks: number;
}
