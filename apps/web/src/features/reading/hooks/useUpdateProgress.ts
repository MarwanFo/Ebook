import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookDetailDto,
  BookStatus,
  BookSummaryDto,
  PaginatedResponse,
  ReadingProgressDto,
  UpdateProgressDto,
} from '@bookflow/shared-types';
import { readingApi } from '../services/reading-api';

export function useUpdateProgress(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateProgressDto) => readingApi.updateProgress(bookId, dto),
    onSuccess: (updated: ReadingProgressDto) => {
      // Optimistically update reading progress cache
      queryClient.setQueryData(['reading-progress', bookId], updated);

      const isCompleted = updated.progressPercentage >= 99;
      const newStatus = isCompleted ? BookStatus.COMPLETED : BookStatus.READING;

      // Optimistically update book status and lastOpenedAt in individual book query
      queryClient.setQueryData<BookDetailDto | undefined>(['book', bookId], (old) => {
        if (!old) return old;
        return {
          ...old,
          status: newStatus,
          lastOpenedAt: updated.updatedAt || new Date().toISOString(),
        };
      });

      // Optimistically update books list cache
      queryClient.setQueriesData<PaginatedResponse<BookSummaryDto>>(
        { queryKey: ['books'] },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((b) =>
              b.id === bookId
                ? {
                    ...b,
                    status: newStatus,
                    lastOpenedAt: updated.updatedAt || new Date().toISOString(),
                  }
                : b,
            ),
          };
        },
      );

      // Synchronize live with server
      queryClient.invalidateQueries({ queryKey: ['reading-progress', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.refetchQueries({ queryKey: ['books'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['library-stats'], type: 'active' });
    },
  });
}
