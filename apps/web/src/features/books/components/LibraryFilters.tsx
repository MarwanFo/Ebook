import React from 'react';
import { BookFormat, BookQueryDto, BookStatus } from '@bookflow/shared-types';

interface LibraryFiltersProps {
  filters: BookQueryDto;
  onFilterChange: (updated: Partial<BookQueryDto>) => void;
  onUploadClick: () => void;
}

export const LibraryFilters: React.FC<LibraryFiltersProps> = ({
  filters,
  onFilterChange,
  onUploadClick,
}) => {
  return (
    <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          placeholder="Search your library by title or author..."
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-surface text-text border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
        <svg
          className="w-4 h-4 absolute left-3 top-3 text-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Format Filter Tabs */}
        <div className="flex border rounded-lg p-1 bg-surface border-border text-xs font-medium">
          <button
            type="button"
            onClick={() => onFilterChange({ format: undefined, page: 1 })}
            className={`px-3 py-1 rounded-md transition-colors ${
              !filters.format
                ? 'bg-primary text-primary-contrast shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            All Formats
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ format: BookFormat.EPUB, page: 1 })}
            className={`px-3 py-1 rounded-md transition-colors ${
              filters.format === BookFormat.EPUB
                ? 'bg-primary text-primary-contrast shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            EPUB
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ format: BookFormat.PDF, page: 1 })}
            className={`px-3 py-1 rounded-md transition-colors ${
              filters.format === BookFormat.PDF
                ? 'bg-primary text-primary-contrast shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            PDF
          </button>
        </div>

        {/* Status Filter */}
        <select
          value={filters.status || ''}
          onChange={(e) =>
            onFilterChange({
              status: e.target.value ? (e.target.value as BookStatus) : undefined,
              page: 1,
            })
          }
          className="px-3 py-2 border rounded-lg bg-surface text-text border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value={BookStatus.UNREAD}>Unread</option>
          <option value={BookStatus.READING}>Reading</option>
          <option value={BookStatus.COMPLETED}>Completed</option>
        </select>

        {/* Upload Button */}
        <button
          type="button"
          onClick={onUploadClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-contrast rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Book
        </button>
      </div>
    </div>
  );
};
