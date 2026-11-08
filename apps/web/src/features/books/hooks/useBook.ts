import { useQuery } from '@tanstack/react-query';
import { booksApi } from '../services/books-api';

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: ['book', id],
    queryFn: () => (id ? booksApi.getBook(id) : Promise.reject('No ID')),
    enabled: Boolean(id),
  });
}
