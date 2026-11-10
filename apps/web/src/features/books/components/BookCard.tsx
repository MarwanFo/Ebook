import React from 'react';
import { BookFormat, BookStatus, BookSummaryDto } from '@bookflow/shared-types';
import { Trash2 } from 'lucide-react';
import { booksApi } from '../services/books-api';
import { RealisticBookCover } from './RealisticBookCover';

interface BookCardProps {
  book: BookSummaryDto;
  onSelect: (book: BookSummaryDto) => void;
  onDelete: (id: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onSelect, onDelete }) => {
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
    <div className="group relative flex flex-col bg-surface border border-border rounded-xl p-3 shadow-xs hover:shadow-md transition-all duration-200">
      {/* 3D Realistic Book Cover */}
      <div onClick={() => onSelect(book)} className="cursor-pointer mb-3">
        <RealisticBookCover
          title={book.title}
          author={book.author}
          coverUrl={book.hasCover ? booksApi.getBookCoverUrl(book.id) : null}
          format={book.format}
          isReading={book.status === BookStatus.READING}
        />
      </div>

      {/* Delete Quick Action Top Right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Delete "${book.title}" from your library?`)) {
            onDelete(book.id);
          }
        }}
        className="absolute top-4 right-4 z-30 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-sm focus:opacity-100"
        title="Delete book"
        aria-label="Delete book"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Book Metadata Footer */}
      <div className="flex flex-col flex-1 justify-between pt-1">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${getFormatBadgeClass(
                book.format,
              )}`}
            >
              {book.format}
            </span>
            {getStatusBadge(book.status)}
          </div>
          <h4
            onClick={() => onSelect(book)}
            className="text-xs font-bold text-text line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          >
            {book.title}
          </h4>
          <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
            {book.author || 'Unknown Author'}
          </p>
          <div className="flex items-center justify-end mt-2 pt-1 border-t border-border/40">
            <button
              type="button"
              onClick={() => onSelect(book)}
              className="text-[11px] font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
