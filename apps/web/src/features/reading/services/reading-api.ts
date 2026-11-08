import { ReadingProgressDto, UpdateProgressDto } from '@bookflow/shared-types';
import { request } from '../../../services/api-client';

export const readingApi = {
  async getProgress(bookId: string): Promise<ReadingProgressDto | null> {
    return request<ReadingProgressDto | null>(`/reading/${bookId}/progress`, {
      method: 'GET',
    });
  },

  async updateProgress(bookId: string, dto: UpdateProgressDto): Promise<ReadingProgressDto> {
    return request<ReadingProgressDto>(`/reading/${bookId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },
};
