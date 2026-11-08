import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateBookmarkDto } from '@bookflow/shared-types';
import { bookmarksApi } from '../services/bookmarks-api';

export function useUpdateBookmark(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookmarkId, dto }: { bookmarkId: string; dto: UpdateBookmarkDto }) =>
      bookmarksApi.updateBookmark(bookmarkId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', bookId] });
    },
  });
}
