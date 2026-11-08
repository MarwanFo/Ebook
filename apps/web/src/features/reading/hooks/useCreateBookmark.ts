import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateBookmarkDto } from '@bookflow/shared-types';
import { bookmarksApi } from '../services/bookmarks-api';

export function useCreateBookmark(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBookmarkDto) => bookmarksApi.createBookmark(bookId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', bookId] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
    },
  });
}
