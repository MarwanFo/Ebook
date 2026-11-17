import { useQuery } from '@tanstack/react-query';
import { BookQueryDto } from '@bookflow/shared-types';
import { booksApi } from '../services/books-api';

export interface UseBooksOptions {
  enabled?: boolean;
}

export function useBooks(query: BookQueryDto = {}, options: UseBooksOptions = {}) {
  return useQuery({
    queryKey: ['books', query],
    queryFn: () => booksApi.getBooks(query),
    staleTime: 0,
    ...options,
  });
}
