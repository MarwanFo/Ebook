import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookmarksApi } from '../services/bookmarks-api';

export function useDeleteBookmark(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookmarkId: string) => bookmarksApi.deleteBookmark(bookmarkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', bookId] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
    },
  });
}
