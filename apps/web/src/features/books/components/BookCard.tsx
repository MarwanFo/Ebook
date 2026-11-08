import React, { useState } from 'react';
import { BookFormat, BookStatus, BookSummaryDto } from '@bookflow/shared-types';
import { booksApi } from '../services/books-api';

interface BookCardProps {
  book: BookSummaryDto;
  onSelect: (book: BookSummaryDto) => void;
  onDelete: (id: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onSelect, onDelete }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const getFormatBadgeClass = (format: BookFormat) => {
    return format === BookFormat.EPUB
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
  };

  const getStatusBadge = (status: BookStatus) => {
    switch (status) {
      case BookStatus.READING:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            Reading
          </span>
        );
      case BookStatus.COMPLETED:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
            Finished
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
            Unread
          </span>
        );
    }
  };

  return (
    <div className="group relative flex flex-col bg-surface border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      {/* Book Cover Container */}
      <div
        onClick={() => onSelect(book)}
        className="relative aspect-[2/3] w-full bg-surface-muted overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {book.hasCover && !imageFailed ? (
          <img
            src={booksApi.getBookCoverUrl(book.id)}
            alt={book.title}
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-surface-muted to-surface border-b border-border">
            <svg
              className="w-12 h-12 text-text-muted mb-3 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="text-xs font-semibold text-text line-clamp-3 mb-1">{book.title}</span>
            <span className="text-[10px] text-text-muted line-clamp-1">
              {book.author || 'Unknown Author'}
            </span>
          </div>
        )}

        {/* Format Badge Top Left */}
        <span
          className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${getFormatBadgeClass(
            book.format,
          )}`}
        >
          {book.format}
        </span>

        {/* Delete Quick Action Top Right */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete "${book.title}" from your library?`)) {
              onDelete(book.id);
            }
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all focus:opacity-100"
          title="Delete book"
          aria-label="Delete book"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Book Metadata Footer */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div className="cursor-pointer" onClick={() => onSelect(book)}>
          <h3
            className="text-sm font-semibold text-text line-clamp-1 hover:text-primary transition-colors"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
            {book.author || 'Unknown Author'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
          {getStatusBadge(book.status)}
          <button
            type="button"
            onClick={() => onSelect(book)}
            className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Details &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
