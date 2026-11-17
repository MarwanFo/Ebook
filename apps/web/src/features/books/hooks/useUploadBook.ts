import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookSummaryDto,
  BookUploadResponseDto,
  LibraryStatsDto,
  PaginatedResponse,
} from '@bookflow/shared-types';
import { booksApi } from '../services/books-api';

export function useUploadBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => booksApi.uploadBook(file),
    onSuccess: (data: BookUploadResponseDto) => {
      const newBook = data.book;

      // Optimistically insert newly uploaded book into all active/cached book list queries
      queryClient.setQueriesData<PaginatedResponse<BookSummaryDto>>(
        { queryKey: ['books'] },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          if (old.data.some((b) => b.id === newBook.id)) return old;
          return {
            ...old,
            data: [newBook, ...old.data],
            meta: old.meta
              ? {
                  ...old.meta,
                  pagination: old.meta.pagination
                    ? {
                        ...old.meta.pagination,
                        total: old.meta.pagination.total + 1,
                      }
                    : old.meta.pagination,
                }
              : old.meta,
          };
        },
      );

      // Cache single book query directly
      queryClient.setQueryData(['book', newBook.id], newBook);

      // Optimistically increment library statistics
      queryClient.setQueryData<LibraryStatsDto>(['library-stats'], (old) => {
        if (!old) return old;
        return {
          ...old,
          totalBooks: (old.totalBooks ?? 0) + 1,
          unreadBooks: (old.unreadBooks ?? 0) + 1,
        };
      });

      // Synchronize live with server
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      queryClient.refetchQueries({ queryKey: ['books'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['library-stats'], type: 'active' });
    },
  });
}
