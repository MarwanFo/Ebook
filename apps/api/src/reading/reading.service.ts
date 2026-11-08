import { Injectable, NotFoundException } from '@nestjs/common';
import { BookStatus, LocationType as PrismaLocationType, Prisma } from '@prisma/client';
import { LocationType, ReaderSettingsDto, ReadingProgressDto } from '@bookflow/shared-types';
import { PrismaService } from '../database/prisma.service';
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
}
