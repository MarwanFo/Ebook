import { useQuery } from '@tanstack/react-query';
import { bookmarksApi } from '../services/bookmarks-api';

export function useBookmarks(bookId: string | undefined) {
  return useQuery({
    queryKey: ['bookmarks', bookId],
    queryFn: () => (bookId ? bookmarksApi.getBookmarks(bookId) : Promise.resolve([])),
    enabled: Boolean(bookId),
    staleTime: 30000,
  });
}
