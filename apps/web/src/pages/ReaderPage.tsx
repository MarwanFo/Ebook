import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, AlertTriangle } from 'lucide-react';
import { BookFormat } from '@bookflow/shared-types';
import { useBook } from '../features/books/hooks/useBook';
import { EpubReader } from '../features/reading/components/EpubReader';

export const ReaderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: book, isLoading, isError, error } = useBook(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper-50 dark:bg-paper-950 p-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-text-muted">Loading your book...</p>
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper-50 dark:bg-paper-950 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-text mb-2">Book Not Found</h2>
        <p className="text-sm text-text-muted max-w-md mb-6">
          {error instanceof Error
            ? error.message
            : 'We could not find or open the requested book in your library.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-contrast font-medium text-sm hover:bg-primary-hover transition-colors shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>
      </div>
    );
  }

  // Handle PDF format notice until Phase 5
  if (book.format === BookFormat.PDF) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper-50 dark:bg-paper-950 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-text mb-2">{book.title}</h2>
        <p className="text-sm text-text-muted max-w-md mb-6">
          This document is in PDF format. The full PDF reading engine is being delivered in Phase 5.
          In the meantime, you can preview the raw document.
        </p>
        <div className="flex gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-surface text-text font-medium text-sm hover:bg-surface-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </Link>
          <a
            href={`/api/v1/books/${book.id}/file`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-contrast font-medium text-sm hover:bg-primary-hover transition-colors shadow"
          >
            Open Raw PDF
          </a>
        </div>
      </div>
    );
  }

  // EPUB Reader Engine
  return (
    <EpubReader
      bookId={book.id}
      bookTitle={book.title}
      author={book.author ?? undefined}
    />
  );
};
