"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
let ReadingService = class ReadingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProgress(userId, bookId) {
        const book = await this.prisma.book.findFirst({
            where: { id: bookId, ownerId: userId },
        });
        if (!book) {
            throw new common_1.NotFoundException(`Book with ID "${bookId}" not found`);
        }
        const progress = await this.prisma.readingProgress.findUnique({
            where: {
                userId_bookId: {
                    userId,
                    bookId,
                },
            },
        });
        if (!progress) {
            return null;
        }
        return {
            id: progress.id,
            userId: progress.userId,
            bookId: progress.bookId,
            locationType: progress.locationType,
            locationValue: progress.locationValue,
            progressPercentage: progress.progressPercentage,
            currentPage: progress.currentPage,
            totalPages: progress.totalPages,
            settings: progress.settingsJson || null,
            updatedAt: progress.updatedAt.toISOString(),
        };
    }
    async updateProgress(userId, bookId, dto) {
        const book = await this.prisma.book.findFirst({
            where: { id: bookId, ownerId: userId },
        });
        if (!book) {
            throw new common_1.NotFoundException(`Book with ID "${bookId}" not found`);
        }
        // Determine updated book status based on progress
        let targetStatus = book.status;
        if (dto.progressPercentage >= 99) {
            targetStatus = client_1.BookStatus.COMPLETED;
        }
        else if (book.status === client_1.BookStatus.UNREAD && dto.progressPercentage > 0) {
            targetStatus = client_1.BookStatus.READING;
        }
        const [progress] = await this.prisma.$transaction([
            this.prisma.readingProgress.upsert({
                where: {
                    userId_bookId: {
                        userId,
                        bookId,
                    },
                },
                create: {
                    userId,
                    bookId,
                    locationType: dto.locationType,
                    locationValue: dto.locationValue,
                    progressPercentage: dto.progressPercentage,
                    currentPage: dto.currentPage,
                    totalPages: dto.totalPages,
                    settingsJson: dto.settings
                        ? dto.settings
                        : undefined,
                },
                update: {
                    locationType: dto.locationType,
                    locationValue: dto.locationValue,
                    progressPercentage: dto.progressPercentage,
                    currentPage: dto.currentPage,
                    totalPages: dto.totalPages,
                    settingsJson: dto.settings
                        ? dto.settings
                        : undefined,
                },
            }),
            this.prisma.book.update({
                where: { id: bookId },
                data: {
                    lastOpenedAt: new Date(),
                    status: targetStatus,
                },
            }),
        ]);
        return {
            id: progress.id,
            userId: progress.userId,
            bookId: progress.bookId,
            locationType: progress.locationType,
            locationValue: progress.locationValue,
            progressPercentage: progress.progressPercentage,
            currentPage: progress.currentPage,
            totalPages: progress.totalPages,
            settings: progress.settingsJson || null,
            updatedAt: progress.updatedAt.toISOString(),
        };
    }
    async getBookmarks(userId, bookId) {
        const book = await this.prisma.book.findFirst({
            where: { id: bookId, ownerId: userId },
        });
        if (!book) {
            throw new common_1.NotFoundException(`Book with ID "${bookId}" not found`);
        }
        const bookmarks = await this.prisma.bookmark.findMany({
            where: { userId, bookId },
            orderBy: { progressPercentage: 'asc' },
        });
        return bookmarks.map((b) => ({
            id: b.id,
            userId: b.userId,
            bookId: b.bookId,
            locationType: b.locationType,
            locationValue: b.locationValue,
            progressPercentage: b.progressPercentage,
            title: b.title,
            note: b.note,
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
        }));
    }
    async createBookmark(userId, bookId, dto) {
        const book = await this.prisma.book.findFirst({
            where: { id: bookId, ownerId: userId },
        });
        if (!book) {
            throw new common_1.NotFoundException(`Book with ID "${bookId}" not found`);
        }
        const bookmark = await this.prisma.bookmark.create({
            data: {
                userId,
                bookId,
                locationType: dto.locationType,
                locationValue: dto.locationValue,
                progressPercentage: dto.progressPercentage,
                title: dto.title ?? null,
                note: dto.note ?? null,
            },
        });
        return {
            id: bookmark.id,
            userId: bookmark.userId,
            bookId: bookmark.bookId,
            locationType: bookmark.locationType,
            locationValue: bookmark.locationValue,
            progressPercentage: bookmark.progressPercentage,
            title: bookmark.title,
            note: bookmark.note,
            createdAt: bookmark.createdAt.toISOString(),
            updatedAt: bookmark.updatedAt.toISOString(),
        };
    }
    async updateBookmark(userId, bookmarkId, dto) {
        const existing = await this.prisma.bookmark.findFirst({
            where: { id: bookmarkId, userId },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Bookmark with ID "${bookmarkId}" not found`);
        }
        const updated = await this.prisma.bookmark.update({
            where: { id: bookmarkId },
            data: {
                title: dto.title !== undefined ? dto.title : existing.title,
                note: dto.note !== undefined ? dto.note : existing.note,
            },
        });
        return {
            id: updated.id,
            userId: updated.userId,
            bookId: updated.bookId,
            locationType: updated.locationType,
            locationValue: updated.locationValue,
            progressPercentage: updated.progressPercentage,
            title: updated.title,
            note: updated.note,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        };
    }
    async deleteBookmark(userId, bookmarkId) {
        const existing = await this.prisma.bookmark.findFirst({
            where: { id: bookmarkId, userId },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Bookmark with ID "${bookmarkId}" not found`);
        }
        await this.prisma.bookmark.delete({
            where: { id: bookmarkId },
        });
    }
    async getLibraryStats(userId) {
        const [totalBooks, readingBooks, completedBooks, unreadBooks, totalBookmarks] = await Promise.all([
            this.prisma.book.count({ where: { ownerId: userId } }),
            this.prisma.book.count({ where: { ownerId: userId, status: client_1.BookStatus.READING } }),
            this.prisma.book.count({ where: { ownerId: userId, status: client_1.BookStatus.COMPLETED } }),
            this.prisma.book.count({ where: { ownerId: userId, status: client_1.BookStatus.UNREAD } }),
            this.prisma.bookmark.count({ where: { userId } }),
        ]);
        return {
            totalBooks,
            readingBooks,
            completedBooks,
            unreadBooks,
            totalBookmarks,
        };
    }
};
exports.ReadingService = ReadingService;
exports.ReadingService = ReadingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReadingService);
