/**
 * Canonical Domain Enums for BookFlow API Contracts.
 *
 * Mapping Note (Amendment 8):
 * These enums define the public API contracts shared between backend and frontend.
 * In the database layer (Prisma schema), corresponding enums (UserRole, BookFormat,
 * BookStatus, LocationType) are defined with identical uppercase literal values.
 * The NestJS API uses these shared enums directly in DTOs and maps them 1:1 to Prisma enums.
 */

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum BookFormat {
  EPUB = 'EPUB',
  PDF = 'PDF',
}

export enum BookStatus {
  UNREAD = 'UNREAD',
  READING = 'READING',
  COMPLETED = 'COMPLETED',
}

export enum LocationType {
  EPUB_CFI = 'EPUB_CFI',
  PDF_PAGE = 'PDF_PAGE',
}

export enum ReaderTheme {
  LIGHT = 'light',
  SEPIA = 'sepia',
  DARK = 'dark',
}

export enum ReaderLayout {
  SINGLE = 'single',
  DOUBLE = 'double',
}
