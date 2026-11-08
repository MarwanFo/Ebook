import { useQuery } from '@tanstack/react-query';
import { readingApi } from '../services/reading-api';

export function useReadingProgress(bookId: string | undefined) {
  return useQuery({
    queryKey: ['reading-progress', bookId],
    queryFn: () => (bookId ? readingApi.getProgress(bookId) : Promise.resolve(null)),
    enabled: Boolean(bookId),
    staleTime: 60000,
  });
}
