import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkDto, CreateBookmarkDto, LibraryStatsDto } from '@bookflow/shared-types';
import { bookmarksApi } from '../services/bookmarks-api';

export function useCreateBookmark(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBookmarkDto) => bookmarksApi.createBookmark(bookId, dto),
    onSuccess: (newBookmark: BookmarkDto) => {
      // Optimistically insert bookmark into local cache
      queryClient.setQueryData<BookmarkDto[]>(['bookmarks', bookId], (old) => {
        return old ? [newBookmark, ...old] : [newBookmark];
      });

      // Optimistically increment stats
      queryClient.setQueryData<LibraryStatsDto>(['library-stats'], (old) => {
        if (!old) return old;
        return {
          ...old,
          totalBookmarks: (old.totalBookmarks ?? 0) + 1,
        };
      });

      // Synchronize live with server
      queryClient.invalidateQueries({ queryKey: ['bookmarks', bookId] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      queryClient.refetchQueries({ queryKey: ['bookmarks', bookId], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['library-stats'], type: 'active' });
    },
  });
}
