import { Test, TestingModule } from '@nestjs/testing';
import { LocationType } from '@bookflow/shared-types';
import { ReadingController } from './reading.controller';
import { ReadingService } from './reading.service';

describe('ReadingController', () => {
  let controller: ReadingController;
  let mockService: jest.Mocked<ReadingService>;

  const mockUserId = 'user-uuid-1';
  const mockBookId = 'book-uuid-1';

  const mockProgress = {
    id: 'prog-1',
    userId: mockUserId,
    bookId: mockBookId,
    locationType: LocationType.EPUB_CFI,
    locationValue: 'epubcfi(/6/2!/4)',
    progressPercentage: 50.0,
    currentPage: 100,
    totalPages: 200,
    settings: { fontSize: 16 },
    updatedAt: new Date().toISOString(),
  };

  const mockBookmark = {
    id: 'bmk-1',
    userId: mockUserId,
    bookId: mockBookId,
    locationType: LocationType.EPUB_CFI,
    locationValue: 'epubcfi(/6/2!/4)',
    progressPercentage: 25.0,
    title: 'Chapter 2 Quote',
    note: 'Memorable passage on courage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockStats = {
    totalBooks: 10,
    readingBooks: 3,
    completedBooks: 5,
    unreadBooks: 2,
    totalBookmarks: 12,
  };

  beforeEach(async () => {
    mockService = {
      getProgress: jest.fn().mockResolvedValue(mockProgress),
      updateProgress: jest.fn().mockResolvedValue({ ...mockProgress, progressPercentage: 55.0 }),
      getBookmarks: jest.fn().mockResolvedValue([mockBookmark]),
      createBookmark: jest.fn().mockResolvedValue(mockBookmark),
      updateBookmark: jest.fn().mockResolvedValue({ ...mockBookmark, title: 'Updated Title' }),
      deleteBookmark: jest.fn().mockResolvedValue(undefined),
      getLibraryStats: jest.fn().mockResolvedValue(mockStats),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadingController],
      providers: [{ provide: ReadingService, useValue: mockService }],
    }).compile();

    controller = module.get<ReadingController>(ReadingController);
  });

  it('should get reading progress and delegate to service', async () => {
    const res = await controller.getProgress(mockUserId, mockBookId);
    expect(mockService.getProgress).toHaveBeenCalledWith(mockUserId, mockBookId);
    expect(res?.progressPercentage).toBe(50.0);
  });

  it('should update reading progress and delegate to service', async () => {
    const updatePayload = {
      locationType: LocationType.EPUB_CFI,
      locationValue: 'epubcfi(/6/4!/4)',
      progressPercentage: 55.0,
    };
    const res = await controller.updateProgress(mockUserId, mockBookId, updatePayload);
    expect(mockService.updateProgress).toHaveBeenCalledWith(mockUserId, mockBookId, updatePayload);
    expect(res.progressPercentage).toBe(55.0);
  });

  it('should get bookmarks for a book', async () => {
    const res = await controller.getBookmarks(mockUserId, mockBookId);
    expect(mockService.getBookmarks).toHaveBeenCalledWith(mockUserId, mockBookId);
    expect(res).toHaveLength(1);
    expect(res[0]?.title).toBe('Chapter 2 Quote');
  });

  it('should create a bookmark for a book', async () => {
    const createPayload = {
      locationType: LocationType.EPUB_CFI,
      locationValue: 'epubcfi(/6/2!/4)',
      progressPercentage: 25.0,
      title: 'Chapter 2 Quote',
      note: 'Memorable passage on courage',
    };
    const res = await controller.createBookmark(mockUserId, mockBookId, createPayload);
    expect(mockService.createBookmark).toHaveBeenCalledWith(mockUserId, mockBookId, createPayload);
    expect(res.id).toBe('bmk-1');
  });

  it('should update an existing bookmark', async () => {
    const updatePayload = { title: 'Updated Title' };
    const res = await controller.updateBookmark(mockUserId, 'bmk-1', updatePayload);
    expect(mockService.updateBookmark).toHaveBeenCalledWith(mockUserId, 'bmk-1', updatePayload);
    expect(res.title).toBe('Updated Title');
  });

  it('should delete an existing bookmark', async () => {
    await controller.deleteBookmark(mockUserId, 'bmk-1');
    expect(mockService.deleteBookmark).toHaveBeenCalledWith(mockUserId, 'bmk-1');
  });

  it('should return library reading stats', async () => {
    const res = await controller.getLibraryStats(mockUserId);
    expect(mockService.getLibraryStats).toHaveBeenCalledWith(mockUserId);
    expect(res.totalBooks).toBe(10);
    expect(res.readingBooks).toBe(3);
    expect(res.totalBookmarks).toBe(12);
  });
});
