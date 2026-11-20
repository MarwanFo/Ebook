"use strict";
/**
 * Canonical Domain Enums for BookFlow API Contracts.
 *
 * Mapping Note (Amendment 8):
 * These enums define the public API contracts shared between backend and frontend.
 * In the database layer (Prisma schema), corresponding enums (UserRole, BookFormat,
 * BookStatus, LocationType) are defined with identical uppercase literal values.
 * The NestJS API uses these shared enums directly in DTOs and maps them 1:1 to Prisma enums.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReaderLayout = exports.ReaderTheme = exports.LocationType = exports.BookStatus = exports.BookFormat = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var BookFormat;
(function (BookFormat) {
    BookFormat["EPUB"] = "EPUB";
    BookFormat["PDF"] = "PDF";
})(BookFormat || (exports.BookFormat = BookFormat = {}));
var BookStatus;
(function (BookStatus) {
    BookStatus["UNREAD"] = "UNREAD";
    BookStatus["READING"] = "READING";
    BookStatus["COMPLETED"] = "COMPLETED";
})(BookStatus || (exports.BookStatus = BookStatus = {}));
var LocationType;
(function (LocationType) {
    LocationType["EPUB_CFI"] = "EPUB_CFI";
    LocationType["PDF_PAGE"] = "PDF_PAGE";
})(LocationType || (exports.LocationType = LocationType = {}));
var ReaderTheme;
(function (ReaderTheme) {
    ReaderTheme["LIGHT"] = "light";
    ReaderTheme["SEPIA"] = "sepia";
    ReaderTheme["DARK"] = "dark";
})(ReaderTheme || (exports.ReaderTheme = ReaderTheme = {}));
var ReaderLayout;
(function (ReaderLayout) {
    ReaderLayout["SINGLE"] = "single";
    ReaderLayout["DOUBLE"] = "double";
})(ReaderLayout || (exports.ReaderLayout = ReaderLayout = {}));
//# sourceMappingURL=enums.js.map