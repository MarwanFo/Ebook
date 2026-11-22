import { useQuery } from '@tanstack/react-query';
import { ExploreBooksQueryDto } from '@bookflow/shared-types';
import { booksApi } from '../services/books-api';

export function useExploreBooks(query: ExploreBooksQueryDto = {}) {
  return useQuery({
    queryKey: ['explore-books', query],
    queryFn: () => booksApi.exploreBooks(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
