import { useQuery } from '@tanstack/react-query';
import { BookQueryDto } from '@bookflow/shared-types';
import { booksApi } from '../services/books-api';

export function useBooks(query: BookQueryDto = {}) {
  return useQuery({
    queryKey: ['books', query],
    queryFn: () => booksApi.getBooks(query),
    staleTime: 30000,
  });
}
