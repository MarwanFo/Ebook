import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookSummaryDto, LibraryStatsDto, PaginatedResponse } from '@bookflow/shared-types';
import { booksApi } from '../services/books-api';

interface DeleteMutationContext {
  previousBooksQueries: [unknown, PaginatedResponse<BookSummaryDto> | undefined][];
  previousStats: LibraryStatsDto | undefined;
}

export function useDeleteBook() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, DeleteMutationContext>({
    mutationFn: (id: string) => booksApi.deleteBook(id),
    onMutate: async (id: string) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['books'] });
      await queryClient.cancelQueries({ queryKey: ['library-stats'] });

      // Snapshot previous states for rollback if request fails
      const previousBooksQueries = queryClient.getQueriesData<PaginatedResponse<BookSummaryDto>>({
        queryKey: ['books'],
      });
      const previousStats = queryClient.getQueryData<LibraryStatsDto>(['library-stats']);

      // Optimistically remove book from all active/cached book lists
      queryClient.setQueriesData<PaginatedResponse<BookSummaryDto>>(
        { queryKey: ['books'] },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.filter((b) => b.id !== id),
            meta: old.meta
              ? {
                  ...old.meta,
                  pagination: old.meta.pagination
                    ? {
                        ...old.meta.pagination,
                        total: Math.max(0, old.meta.pagination.total - 1),
                      }
                    : old.meta.pagination,
                }
              : old.meta,
          };
        },
      );

      // Optimistically decrement library statistics
      queryClient.setQueryData<LibraryStatsDto>(['library-stats'], (old) => {
        if (!old) return old;
        return {
          ...old,
          totalBooks: Math.max(0, (old.totalBooks ?? 1) - 1),
        };
      });

      // Clear individual book query immediately
      queryClient.removeQueries({ queryKey: ['book', id] });

      return { previousBooksQueries, previousStats };
    },
    onError: (_err, _id, context) => {
      // Rollback to snapshot on failure
      if (context?.previousBooksQueries) {
        context.previousBooksQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey as any, data);
        });
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['library-stats'], context.previousStats);
      }
    },
    onSettled: (_data, _err, id) => {
      // Clean up dependent book queries
      queryClient.removeQueries({ queryKey: ['book', id] });
      queryClient.removeQueries({ queryKey: ['bookmarks', id] });
      queryClient.removeQueries({ queryKey: ['reading-progress', id] });

      // Synchronize live with server
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      queryClient.refetchQueries({ queryKey: ['books'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['library-stats'], type: 'active' });
    },
  });
}
