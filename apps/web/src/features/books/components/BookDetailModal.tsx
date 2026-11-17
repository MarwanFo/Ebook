import React, { useState, useEffect } from 'react';
import { BookFormat, BookStatus, BookSummaryDto } from '@bookflow/shared-types';
import { BookOpen, X, Pencil, Trash2, CheckCircle2, Clock, BookMarked } from 'lucide-react';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    status: BookStatus.UNREAD,
  });

  // Synchronize initial form state when book data loads
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        description: book.description || '',
        status: book.status || BookStatus.UNREAD,
      });
    }
  }, [book]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  const getStatusBadge = (status: BookStatus) => {
    switch (status) {
      case BookStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case BookStatus.READING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Clock className="w-3 h-3" />
            Reading
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-paper-200 text-ink-700 dark:bg-paper-800 dark:text-paper-300 border border-paper-300 dark:border-paper-700">
            <BookMarked className="w-3 h-3" />
            Unread
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden p-6 relative max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                bookSummary.format === BookFormat.EPUB
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
              }`}
            >
              {bookSummary.format}
            </span>
            <h2 id="book-detail-title" className="text-lg font-bold text-text truncate">
              {formatBookTitle(bookSummary.title) || bookSummary.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text hover:bg-surface-muted p-1.5 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-6 flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Cover Column */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-40 max-w-full drop-shadow-md">
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
                className="w-40 max-w-full px-4 py-2.5 bg-primary text-primary-contrast rounded-xl font-medium text-sm hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Read Book</span>
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
                    <label className="block text-xs font-semibold text-text mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg bg-surface text-text border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Author</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-surface text-text border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as BookStatus })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-surface text-text border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
                    >
                      <option value={BookStatus.UNREAD}>Unread</option>
                      <option value={BookStatus.READING}>Reading</option>
                      <option value={BookStatus.COMPLETED}>Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-surface text-text border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none transition-colors"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="px-3.5 py-1.5 bg-primary text-primary-contrast rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors shadow-sm"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold font-serif text-text leading-tight">
                        {book?.title || bookSummary.title}
                      </h3>
                      <p className="text-sm font-medium text-text-muted mt-1">
                        {book?.author || bookSummary.author || 'Unknown Author'}
                      </p>
                      <div className="mt-2">
                        {getStatusBadge(book?.status || BookStatus.UNREAD)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-surface-muted transition-colors flex-shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  {book?.description && (
                    <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border">
                      <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                        Description
                      </h4>
                      <p className="text-xs text-text leading-relaxed line-clamp-4">
                        {book.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface-muted/60 border border-border text-xs">
                    <div>
                      <span className="text-text-muted text-[11px] font-medium block uppercase tracking-wider">
                        Publisher
                      </span>
                      <span className="font-semibold text-text mt-0.5 block truncate">
                        {book?.publisher || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted text-[11px] font-medium block uppercase tracking-wider">
                        ISBN
                      </span>
                      <span className="font-semibold text-text mt-0.5 block truncate">
                        {book?.isbn || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted text-[11px] font-medium block uppercase tracking-wider">
                        Format
                      </span>
                      <span className="font-semibold text-text mt-0.5 block">
                        {book?.format || bookSummary.format}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted text-[11px] font-medium block uppercase tracking-wider">
                        File Size
                      </span>
                      <span className="font-semibold text-text mt-0.5 block">
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
        <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete from Library</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-muted border border-border text-text rounded-lg text-xs font-medium hover:bg-border/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        title="Delete from Library"
        message={`Are you sure you want to delete "${formatBookTitle(bookSummary.title) || bookSummary.title}"? This will permanently remove the book and all its bookmarks and reading progress.`}
        confirmLabel="Delete Book"
        isDanger
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={() => {
          setIsConfirmingDelete(false);
          onDelete(bookSummary.id);
          onClose();
        }}
      />
    </div>
  );
};
