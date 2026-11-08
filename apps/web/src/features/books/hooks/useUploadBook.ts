import { useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '../services/books-api';

export function useUploadBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => booksApi.uploadBook(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
