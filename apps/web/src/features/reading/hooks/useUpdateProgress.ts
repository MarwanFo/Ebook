import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateProgressDto } from '@bookflow/shared-types';
import { readingApi } from '../services/reading-api';

export function useUpdateProgress(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateProgressDto) => readingApi.updateProgress(bookId, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(['reading-progress', bookId], updated);
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
