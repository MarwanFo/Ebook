import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookStatus, LocationType as PrismaLocationType } from '@prisma/client';
import { LocationType } from '@bookflow/shared-types';
import { PrismaService } from '../database/prisma.service';
import { ReadingService } from './reading.service';

describe('ReadingService', () => {
  let service: ReadingService;
  let mockPrisma: any;

  const mockUserId = 'user-uuid-1';
  const mockBookId = 'book-uuid-1';

  const mockDbBook = {
    id: mockBookId,
    ownerId: mockUserId,
    title: 'War and Peace',
    status: BookStatus.UNREAD,
    lastOpenedAt: null,
  };

  const mockDbProgress = {
    id: 'progress-uuid-1',
    userId: mockUserId,
    bookId: mockBookId,
    locationType: PrismaLocationType.EPUB_CFI,
    locationValue: 'epubcfi(/6/4[chap01]!/4/2/10)',
    progressPercentage: 15.5,
    currentPage: 24,
    totalPages: 1200,
    settingsJson: { fontSize: 18, theme: 'sepia' },
    updatedAt: new Date('2026-02-01'),
  };

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn(async (cb: any) => {
        if (Array.isArray(cb)) return Promise.all(cb);
        return cb(mockPrisma);
      }),
      book: {
        findFirst: jest.fn().mockResolvedValue(mockDbBook),
        update: jest.fn().mockResolvedValue(mockDbBook),
      },
      readingProgress: {
        findUnique: jest.fn().mockResolvedValue(mockDbProgress),
        upsert: jest.fn().mockResolvedValue(mockDbProgress),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReadingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ReadingService>(ReadingService);
  });

  describe('getProgress', () => {
    it('should return serialized reading progress for an existing book', async () => {
      const result = await service.getProgress(mockUserId, mockBookId);
      expect(result).not.toBeNull();
      expect(result?.locationType).toBe(LocationType.EPUB_CFI);
      expect(result?.locationValue).toBe('epubcfi(/6/4[chap01]!/4/2/10)');
      expect(result?.progressPercentage).toBe(15.5);
      expect(result?.settings?.fontSize).toBe(18);
    });

    it('should throw NotFoundException if book does not exist or belongs to another user', async () => {
      mockPrisma.book.findFirst.mockResolvedValueOnce(null);
      await expect(service.getProgress(mockUserId, 'missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return null if book exists but has no reading progress recorded yet', async () => {
      mockPrisma.readingProgress.findUnique.mockResolvedValueOnce(null);
      const result = await service.getProgress(mockUserId, mockBookId);
      expect(result).toBeNull();
    });
  });

  describe('updateProgress', () => {
    it('should upsert progress record and update book status to READING and set lastOpenedAt', async () => {
      const result = await service.updateProgress(mockUserId, mockBookId, {
        locationType: LocationType.EPUB_CFI,
        locationValue: 'epubcfi(/6/8!/4/2/4)',
        progressPercentage: 42.0,
        settings: { fontSize: 20 },
      });

      expect(result.id).toBe('progress-uuid-1');
      expect(mockPrisma.readingProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_bookId: { userId: mockUserId, bookId: mockBookId } },
          create: expect.objectContaining({
            locationValue: 'epubcfi(/6/8!/4/2/4)',
            progressPercentage: 42.0,
          }),
        }),
      );
      expect(mockPrisma.book.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockBookId },
          data: expect.objectContaining({
            status: BookStatus.READING,
            lastOpenedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should mark book as COMPLETED if progress percentage reaches 99 or 100', async () => {
      await service.updateProgress(mockUserId, mockBookId, {
        locationType: LocationType.EPUB_CFI,
        locationValue: 'epubcfi(/6/99!/4/2/99)',
        progressPercentage: 99.5,
      });

      expect(mockPrisma.book.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: BookStatus.COMPLETED,
          }),
        }),
      );
    });
  });
});
