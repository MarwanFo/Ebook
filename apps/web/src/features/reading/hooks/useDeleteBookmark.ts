import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkDto, LibraryStatsDto } from '@bookflow/shared-types';
import { bookmarksApi } from '../services/bookmarks-api';

interface DeleteBookmarkContext {
  previousBookmarks: BookmarkDto[] | undefined;
  previousStats: LibraryStatsDto | undefined;
}

export function useDeleteBookmark(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, DeleteBookmarkContext>({
    mutationFn: (bookmarkId: string) => bookmarksApi.deleteBookmark(bookmarkId),
    onMutate: async (bookmarkId: string) => {
      await queryClient.cancelQueries({ queryKey: ['bookmarks', bookId] });
      await queryClient.cancelQueries({ queryKey: ['library-stats'] });

      const previousBookmarks = queryClient.getQueryData<BookmarkDto[]>(['bookmarks', bookId]);
      const previousStats = queryClient.getQueryData<LibraryStatsDto>(['library-stats']);

      // Optimistically remove bookmark from local list
      queryClient.setQueryData<BookmarkDto[]>(['bookmarks', bookId], (old) => {
        return old ? old.filter((b) => b.id !== bookmarkId) : [];
      });

      // Optimistically decrement library stats
      queryClient.setQueryData<LibraryStatsDto>(['library-stats'], (old) => {
        if (!old) return old;
        return {
          ...old,
          totalBookmarks: Math.max(0, (old.totalBookmarks ?? 1) - 1),
        };
      });

      return { previousBookmarks, previousStats };
    },
    onError: (_err, _id, context) => {
      if (context?.previousBookmarks) {
        queryClient.setQueryData(['bookmarks', bookId], context.previousBookmarks);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['library-stats'], context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', bookId] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      queryClient.refetchQueries({ queryKey: ['bookmarks', bookId], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['library-stats'], type: 'active' });
    },
  });
}
