import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookDetailDto,
  BookSummaryDto,
  PaginatedResponse,
  UpdateBookDto,
} from '@bookflow/shared-types';
import { booksApi } from '../services/books-api';

export function useUpdateBook(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateBookDto) => booksApi.updateBook(bookId, dto),
    onSuccess: (updatedBook: BookDetailDto) => {
      // Immediately update individual book cache
      queryClient.setQueryData(['book', bookId], updatedBook);

      // Immediately update in all cached book list queries
      queryClient.setQueriesData<PaginatedResponse<BookSummaryDto>>(
        { queryKey: ['books'] },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((b) => (b.id === bookId ? { ...b, ...updatedBook } : b)),
          };
        },
      );

      // Synchronize live with server
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      queryClient.refetchQueries({ queryKey: ['books'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['book', bookId], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['library-stats'], type: 'active' });
    },
  });
}
