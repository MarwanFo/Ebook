import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationType } from '@bookflow/shared-types';
import { readingApi } from '../features/reading/services/reading-api';

describe('readingApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getProgress should send GET request to /reading/:id/progress', async () => {
    const mockProgress = {
      id: 'rp-1',
      bookId: 'b-1',
      userId: 'u-1',
      locationType: LocationType.EPUB_CFI,
      locationValue: 'epubcfi(/6/2[chap1]!/4/2)',
      progressPercentage: 25.5,
      currentPage: 10,
      totalPages: 100,
      settingsJson: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: mockProgress }),
    });

    const result = await readingApi.getProgress('b-1');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reading/b-1/progress'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual(mockProgress);
  });

  it('updateProgress should send PUT request with progress payload', async () => {
    const payload = {
      locationType: LocationType.EPUB_CFI,
      locationValue: 'epubcfi(/6/4[chap2]!/4/2)',
      progressPercentage: 50.0,
      currentPage: 25,
      totalPages: 100,
      settings: { theme: 'sepia', fontSize: 18 },
    };

    const mockResponse = {
      id: 'rp-1',
      bookId: 'b-1',
      userId: 'u-1',
      locationType: LocationType.EPUB_CFI,
      locationValue: payload.locationValue,
      progressPercentage: payload.progressPercentage,
      currentPage: payload.currentPage,
      totalPages: payload.totalPages,
      settingsJson: payload.settings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: mockResponse }),
    });

    const result = await readingApi.updateProgress('b-1', payload);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reading/b-1/progress'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    );
    expect(result.progressPercentage).toBe(50.0);
  });
});
