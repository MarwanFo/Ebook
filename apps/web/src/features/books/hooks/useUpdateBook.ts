import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateBookDto } from '@bookflow/shared-types';
import { booksApi } from '../services/books-api';

export function useUpdateBook(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateBookDto) => booksApi.updateBook(bookId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
    },
  });
}
