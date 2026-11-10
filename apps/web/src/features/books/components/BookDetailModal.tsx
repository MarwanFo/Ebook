import React, { useState } from 'react';
import { BookFormat, BookStatus, BookSummaryDto } from '@bookflow/shared-types';
import { useBook } from '../hooks/useBook';
import { useUpdateBook } from '../hooks/useUpdateBook';
import { booksApi } from '../services/books-api';
import { RealisticBookCover, formatBookTitle } from './RealisticBookCover';

interface BookDetailModalProps {
  bookSummary: BookSummaryDto | null;
  onClose: () => void;
  onRead: (bookId: string) => void;
  onDelete: (bookId: string) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  bookSummary,
  onClose,
  onRead,
  onDelete,
}) => {
  const { data: book, isLoading } = useBook(bookSummary?.id);
  const updateMutation = useUpdateBook(bookSummary?.id || '');

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    status: BookStatus.UNREAD,
  });

  // Synchronize initial form state when book data loads
  React.useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        description: book.description || '',
        status: book.status || BookStatus.UNREAD,
      });
    }
  }, [book]);

  if (!bookSummary) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        title: formData.title,
        author: formData.author || undefined,
        description: formData.description || undefined,
        status: formData.status,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update book', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-xl overflow-hidden p-6 relative max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-detail-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                bookSummary.format === BookFormat.EPUB
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {bookSummary.format}
            </span>
            <h2 id="book-detail-title" className="text-lg font-bold text-text truncate max-w-md">
              {formatBookTitle(bookSummary.title) || bookSummary.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-6 flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cover Column */}
            <div className="flex flex-col items-center">
              <div className="w-40 mb-4">
                <RealisticBookCover
                  title={bookSummary.title}
                  author={bookSummary.author}
                  coverUrl={bookSummary.hasCover ? booksApi.getBookCoverUrl(bookSummary.id) : null}
                  format={bookSummary.format}
                />
              </div>
              <button
                type="button"
                onClick={() => onRead(bookSummary.id)}
                className="w-40 mt-4 px-4 py-2.5 bg-primary text-primary-contrast rounded-xl font-medium text-sm hover:bg-primary-hover transition-all shadow flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Read Book
              </button>
            </div>

            {/* Metadata & Edit Form Column */}
            <div className="md:col-span-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-text-muted">
                  Loading details...
                </div>
              ) : isEditing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg bg-surface text-text border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Author</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-surface text-text border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as BookStatus })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-surface text-text border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value={BookStatus.UNREAD}>Unread</option>
                      <option value={BookStatus.READING}>Reading</option>
                      <option value={BookStatus.COMPLETED}>Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-surface text-text border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-text-muted hover:text-text"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 bg-primary text-primary-contrast rounded-lg text-xs font-medium hover:bg-primary-hover"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-text">{book?.title}</h3>
                      <p className="text-sm font-medium text-text-muted mt-0.5">
                        {book?.author || 'Unknown Author'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 border border-border rounded-lg text-xs font-medium text-text-muted hover:text-text transition-colors"
                    >
                      Edit
                    </button>
                  </div>

                  {book?.description && (
                    <div>
                      <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">
                        Description
                      </h4>
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-4">
                        {book.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
                    <div>
                      <span className="text-text-muted block">Publisher</span>
                      <span className="font-medium text-text">{book?.publisher || '—'}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">ISBN</span>
                      <span className="font-medium text-text">{book?.isbn || '—'}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Format</span>
                      <span className="font-medium text-text">{book?.format}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">File Size</span>
                      <span className="font-medium text-text">
                        {book?.file
                          ? `${(book.file.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${bookSummary.title}"?`)) {
                onDelete(bookSummary.id);
                onClose();
              }
            }}
            className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Delete from Library
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-muted border border-border text-text rounded-lg text-xs font-medium hover:bg-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
