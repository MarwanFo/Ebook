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

  beforeEach(async () => {
    mockService = {
      getProgress: jest.fn().mockResolvedValue(mockProgress),
      updateProgress: jest.fn().mockResolvedValue({ ...mockProgress, progressPercentage: 55.0 }),
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
});
