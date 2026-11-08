import { useQuery } from '@tanstack/react-query';
import { bookmarksApi } from '../services/bookmarks-api';

export function useLibraryStats() {
  return useQuery({
    queryKey: ['library-stats'],
    queryFn: () => bookmarksApi.getLibraryStats(),
    staleTime: 60000,
  });
}
