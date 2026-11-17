import { useQuery } from '@tanstack/react-query';
import { bookmarksApi } from '../services/bookmarks-api';

export interface UseLibraryStatsOptions {
  enabled?: boolean;
}

export function useLibraryStats(options: UseLibraryStatsOptions = {}) {
  return useQuery({
    queryKey: ['library-stats'],
    queryFn: () => bookmarksApi.getLibraryStats(),
    staleTime: 0,
    ...options,
  });
}
