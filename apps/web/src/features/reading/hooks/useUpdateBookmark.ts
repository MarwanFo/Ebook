import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkDto, UpdateBookmarkDto } from '@bookflow/shared-types';
import { bookmarksApi } from '../services/bookmarks-api';

export function useUpdateBookmark(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookmarkId, dto }: { bookmarkId: string; dto: UpdateBookmarkDto }) =>
      bookmarksApi.updateBookmark(bookmarkId, dto),
    onSuccess: (updated: BookmarkDto) => {
      // Optimistically update bookmark in cached list
      queryClient.setQueryData<BookmarkDto[]>(['bookmarks', bookId], (old) => {
        return old ? old.map((b) => (b.id === updated.id ? updated : b)) : [updated];
      });

      // Synchronize live with server
      queryClient.invalidateQueries({ queryKey: ['bookmarks', bookId] });
      queryClient.refetchQueries({ queryKey: ['bookmarks', bookId], type: 'active' });
    },
  });
}
