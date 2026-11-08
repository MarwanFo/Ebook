import React from 'react';
import { BookSummaryDto, PaginationMeta } from '@bookflow/shared-types';
import { BookCard } from './BookCard';

interface BookGridProps {
  books: BookSummaryDto[];
  isLoading: boolean;
  pagination?: PaginationMeta;
  onPageChange: (page: number) => void;
  onSelectBook: (book: BookSummaryDto) => void;
  onDeleteBook: (id: string) => void;
  onUploadClick: () => void;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  isLoading,
  pagination,
  onPageChange,
  onSelectBook,
  onDeleteBook,
  onUploadClick,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col bg-surface border border-border rounded-xl overflow-hidden animate-pulse aspect-[2/3]"
          >
            <div className="w-full h-full bg-surface-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (!books || books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-dashed border-border rounded-2xl my-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-text mb-1">Your library is empty</h3>
        <p className="text-xs text-text-muted max-w-sm mb-6">
          Upload EPUB or PDF documents to build your collection and start reading with authentic
          typography and progress tracking.
        </p>
        <button
          type="button"
          onClick={onUploadClick}
          className="px-4 py-2 bg-primary text-primary-contrast rounded-lg text-xs font-semibold hover:bg-primary-hover shadow-sm transition-all"
        >
          Upload Your First Book
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} onSelect={onSelectBook} onDelete={onDeleteBook} />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-text-muted">
          <span>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} books)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40 hover:text-text hover:bg-surface-muted transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!pagination.hasNextPage}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40 hover:text-text hover:bg-surface-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
