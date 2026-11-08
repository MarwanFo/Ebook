import { Injectable, NotFoundException } from '@nestjs/common';
import { BookStatus, LocationType as PrismaLocationType, Prisma } from '@prisma/client';
import {
  BookmarkDto,
  LibraryStatsDto,
  LocationType,
  ReaderSettingsDto,
  ReadingProgressDto,
} from '@bookflow/shared-types';
import { PrismaService } from '../database/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress(userId: string, bookId: string): Promise<ReadingProgressDto | null> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, ownerId: userId },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID "${bookId}" not found`);
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
      locationType: progress.locationType as unknown as LocationType,
      locationValue: progress.locationValue,
      progressPercentage: progress.progressPercentage,
      currentPage: progress.currentPage,
      totalPages: progress.totalPages,
      settings: (progress.settingsJson as ReaderSettingsDto) || null,
      updatedAt: progress.updatedAt.toISOString(),
    };
  }

  async updateProgress(
    userId: string,
    bookId: string,
    dto: UpdateProgressDto,
  ): Promise<ReadingProgressDto> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, ownerId: userId },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID "${bookId}" not found`);
    }

    // Determine updated book status based on progress
    let targetStatus = book.status;
    if (dto.progressPercentage >= 99) {
      targetStatus = BookStatus.COMPLETED;
    } else if (book.status === BookStatus.UNREAD && dto.progressPercentage > 0) {
      targetStatus = BookStatus.READING;
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
          locationType: dto.locationType as unknown as PrismaLocationType,
          locationValue: dto.locationValue,
          progressPercentage: dto.progressPercentage,
          currentPage: dto.currentPage,
          totalPages: dto.totalPages,
          settingsJson: dto.settings
            ? (dto.settings as unknown as Prisma.InputJsonValue)
            : undefined,
        },
        update: {
          locationType: dto.locationType as unknown as PrismaLocationType,
          locationValue: dto.locationValue,
          progressPercentage: dto.progressPercentage,
          currentPage: dto.currentPage,
          totalPages: dto.totalPages,
          settingsJson: dto.settings
            ? (dto.settings as unknown as Prisma.InputJsonValue)
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
      locationType: progress.locationType as unknown as LocationType,
      locationValue: progress.locationValue,
      progressPercentage: progress.progressPercentage,
      currentPage: progress.currentPage,
      totalPages: progress.totalPages,
      settings: (progress.settingsJson as ReaderSettingsDto) || null,
      updatedAt: progress.updatedAt.toISOString(),
    };
  }

  async getBookmarks(userId: string, bookId: string): Promise<BookmarkDto[]> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, ownerId: userId },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID "${bookId}" not found`);
    }

    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId, bookId },
      orderBy: { progressPercentage: 'asc' },
    });

    return bookmarks.map((b) => ({
      id: b.id,
      userId: b.userId,
      bookId: b.bookId,
      locationType: b.locationType as unknown as LocationType,
      locationValue: b.locationValue,
      progressPercentage: b.progressPercentage,
      title: b.title,
      note: b.note,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));
  }

  async createBookmark(
    userId: string,
    bookId: string,
    dto: CreateBookmarkDto,
  ): Promise<BookmarkDto> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, ownerId: userId },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID "${bookId}" not found`);
    }

    const bookmark = await this.prisma.bookmark.create({
      data: {
        userId,
        bookId,
        locationType: dto.locationType as unknown as PrismaLocationType,
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
      locationType: bookmark.locationType as unknown as LocationType,
      locationValue: bookmark.locationValue,
      progressPercentage: bookmark.progressPercentage,
      title: bookmark.title,
      note: bookmark.note,
      createdAt: bookmark.createdAt.toISOString(),
      updatedAt: bookmark.updatedAt.toISOString(),
    };
  }

  async updateBookmark(
    userId: string,
    bookmarkId: string,
    dto: UpdateBookmarkDto,
  ): Promise<BookmarkDto> {
    const existing = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Bookmark with ID "${bookmarkId}" not found`);
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
      locationType: updated.locationType as unknown as LocationType,
      locationValue: updated.locationValue,
      progressPercentage: updated.progressPercentage,
      title: updated.title,
      note: updated.note,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteBookmark(userId: string, bookmarkId: string): Promise<void> {
    const existing = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Bookmark with ID "${bookmarkId}" not found`);
    }

    await this.prisma.bookmark.delete({
      where: { id: bookmarkId },
    });
  }

  async getLibraryStats(userId: string): Promise<LibraryStatsDto> {
    const [totalBooks, readingBooks, completedBooks, unreadBooks, totalBookmarks] =
      await Promise.all([
        this.prisma.book.count({ where: { ownerId: userId } }),
        this.prisma.book.count({ where: { ownerId: userId, status: BookStatus.READING } }),
        this.prisma.book.count({ where: { ownerId: userId, status: BookStatus.COMPLETED } }),
        this.prisma.book.count({ where: { ownerId: userId, status: BookStatus.UNREAD } }),
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
}
