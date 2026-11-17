import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ShieldCheck,
  Bookmark,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Library,
  Feather,
  Layers,
} from 'lucide-react';
import { BookQueryDto, BookSummaryDto } from '@bookflow/shared-types';
import { useAuthStore } from '../features/auth/stores/auth-store';
import { useBooks } from '../features/books/hooks/useBooks';
import { useDeleteBook } from '../features/books/hooks/useDeleteBook';
import { useLibraryStats } from '../features/reading/hooks/useLibraryStats';
import { LibraryFilters } from '../features/books/components/LibraryFilters';
import { BookGrid } from '../features/books/components/BookGrid';
import { UploadModal } from '../features/books/components/UploadModal';
import { BookDetailModal } from '../features/books/components/BookDetailModal';
import { formatBookTitle } from '../features/books/components/RealisticBookCover';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ApiHealthStatus } from '../components/health/ApiHealthStatus';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { status, user } = useAuthStore();
  const isAuthenticated = status === 'authenticated';

  // Library State for Authenticated View
  const [filters, setFilters] = useState<BookQueryDto>({
    page: 1,
    limit: 18,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSummaryDto | null>(null);
  const [bookToDelete, setBookToDelete] = useState<BookSummaryDto | null>(null);

  const { data: booksData, isLoading: isBooksLoading } = useBooks(filters, {
    enabled: isAuthenticated,
  });
  const { data: stats } = useLibraryStats({
    enabled: isAuthenticated,
  });
  const deleteMutation = useDeleteBook();

  // Safely extract books array and pagination metadata regardless of envelope shape
  const booksList: BookSummaryDto[] = Array.isArray(booksData)
    ? booksData
    : Array.isArray(booksData?.data)
      ? booksData.data
      : [];

  const paginationMeta =
    booksData && !Array.isArray(booksData) && 'meta' in booksData && booksData.meta?.pagination
      ? booksData.meta.pagination
      : undefined;

  const continueBook = booksList.find((b) => b.status === 'READING' || b.lastOpenedAt) || null;

  const handleFilterChange = (updated: Partial<BookQueryDto>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await deleteMutation.mutateAsync(bookId);
      if (selectedBook?.id === bookId) {
        setSelectedBook(null);
      }
    } catch (err) {
      console.error('Failed to delete book', err);
    }
  };

  const handlePromptDelete = (bookId: string) => {
    const book = booksList.find((b) => b.id === bookId);
    if (book) {
      setBookToDelete(book);
    } else {
      handleDeleteBook(bookId);
    }
  };

  const handleReadBook = (bookId: string) => {
    navigate(`/reader/${bookId}`);
  };

  // If user is logged in, present the Ebook Library Catalog
  if (isAuthenticated) {
    return (
      <div className="space-y-8 animate-fade-in pb-12 p-4 sm:p-6 lg:p-8">
        {/* Welcome Masthead */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <Feather className="w-3.5 h-3.5" />
              <span>Personal Literary Collection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-text">
              Welcome back, {user?.displayName || user?.email.split('@')[0]}
            </h1>
            <p className="text-sm text-text-muted mt-1 max-w-xl leading-relaxed">
              Your reading sanctuary. Discover, annotate, and experience your digital library with
              authentic bookbinding craft.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-contrast font-medium text-xs sm:text-sm hover:bg-primary-hover shadow-sm active:scale-[0.98] transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Add Ebook</span>
            </button>
          </div>
        </div>

        {/* Reading Dashboard Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
              <span>Collection</span>
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold font-serif text-text">
                {stats?.totalBooks ?? paginationMeta?.total ?? booksList.length}
              </span>
              <span className="text-xs text-text-muted ml-1.5 font-normal">titles</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
              <span>Reading</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold font-serif text-text">
                {stats?.readingBooks ?? 0}
              </span>
              <span className="text-xs text-text-muted ml-1.5 font-normal">active</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
              <span>Finished</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold font-serif text-text">
                {stats?.completedBooks ?? 0}
              </span>
              <span className="text-xs text-text-muted ml-1.5 font-normal">books</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
              <span>Highlights</span>
              <Bookmark className="w-4 h-4 text-brand-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold font-serif text-text">
                {stats?.totalBookmarks ?? 0}
              </span>
              <span className="text-xs text-text-muted ml-1.5 font-normal">notes</span>
            </div>
          </div>
        </div>

        {/* Continue Reading Desk */}
        {continueBook && (
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-surface border border-primary/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-18 rounded-xl bg-surface border border-border shadow-md flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-wider">
                    {continueBook.format}
                  </span>
                  <span className="text-xs text-text-muted font-medium">Continue Reading</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold font-serif text-text truncate">
                  {formatBookTitle(continueBook.title) || continueBook.title}
                </h3>
                {continueBook.author && (
                  <p className="text-xs text-text-muted mt-0.5">by {continueBook.author}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleReadBook(continueBook.id)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-contrast text-xs sm:text-sm font-semibold shadow-sm active:scale-[0.98] transition-all self-start sm:self-auto flex-shrink-0"
            >
              <span>Resume Reading</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters and Controls */}
        <LibraryFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onUploadClick={() => setIsUploadOpen(true)}
        />

        {/* Books Grid (Preserved 100% with RealisticBookCover) */}
        <BookGrid
          books={booksList}
          isLoading={isBooksLoading}
          pagination={paginationMeta}
          onPageChange={(page) => handleFilterChange({ page })}
          onSelectBook={(book) => setSelectedBook(book)}
          onDeleteBook={handlePromptDelete}
          onUploadClick={() => setIsUploadOpen(true)}
        />

        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => {
            setIsUploadOpen(false);
          }}
        />

        {/* Book Detail Modal */}
        <BookDetailModal
          bookSummary={selectedBook}
          onClose={() => setSelectedBook(null)}
          onRead={handleReadBook}
          onDelete={handleDeleteBook}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={Boolean(bookToDelete)}
          title="Delete from Library"
          message={`Are you sure you want to delete "${bookToDelete ? formatBookTitle(bookToDelete.title) || bookToDelete.title : ''}"? This will permanently remove the book and all its bookmarks and reading progress.`}
          confirmLabel="Delete Book"
          isDanger
          isLoading={deleteMutation.isPending}
          onClose={() => setBookToDelete(null)}
          onConfirm={async () => {
            if (bookToDelete) {
              const id = bookToDelete.id;
              setBookToDelete(null);
              await handleDeleteBook(id);
            }
          }}
        />
      </div>
    );
  }

  // Guest Landing View (Anthropic Frontend-Design Editorial Standard)
  const architectureHighlights = [
    {
      title: 'Dual Engine Core (EPUB & PDF)',
      description:
        'Custom EPUB.js and PDF.js render pipelines with authentic two-page facing spreads, cross-device progress synchronization, and zero lag.',
      icon: BookOpen,
      tag: 'Engine',
    },
    {
      title: 'Tactile Physical Book Craft',
      description:
        'Procedural leather bookbinding cords, gold-foiled title typography, rounded spines, and authentic page-turn physics with keyboard navigation.',
      icon: Layers,
      tag: 'Experience',
    },
    {
      title: 'Distraction-Free Annotations',
      description:
        'Highlight passages with 5 contextual palettes, attach rich markdown thoughts, export notes, and jump directly to bookmarks.',
      icon: Bookmark,
      tag: 'Literary',
    },
    {
      title: 'Hardened Security & Cloud Sync',
      description:
        'Argon2id cryptographic hashing, rotating family-tracked JWT refresh sessions, Helmet headers, and streaming byte-range requests.',
      icon: ShieldCheck,
      tag: 'Architecture',
    },
  ];

  return (
    <div className="space-y-12 animate-fade-in pb-16 p-4 sm:p-6 lg:p-8">
      {/* Editorial Hero Exhibition */}
      <div className="relative rounded-3xl bg-surface border border-border shadow-xl overflow-hidden p-8 sm:p-14 text-center">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Realistic Ebook Reading Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold font-serif tracking-tight text-text leading-[1.15]">
            Read with Focus, Depth, and Authenticity.
          </h1>

          <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-2xl mx-auto">
            BookFlow bridges the tactile intimacy of physical hardcovers with the freedom of an open
            digital library. True two-page spreads, custom typography, and zero distractions.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-primary-contrast font-semibold text-sm hover:bg-primary-hover shadow-md active:scale-[0.98] transition-all"
            >
              <span>Create Free Library</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="px-7 py-3 rounded-xl border border-border bg-surface text-text font-semibold text-sm hover:bg-surface-muted active:scale-[0.98] transition-all"
            >
              Sign In to Catalog
            </Link>
          </div>
        </div>

        {/* Feature Quote Bar */}
        <div className="mt-12 pt-8 border-t border-border/60 max-w-xl mx-auto">
          <p className="font-serif italic text-text-muted text-sm leading-relaxed">
            &ldquo;A room without books is like a body without a soul.&rdquo;
          </p>
          <span className="text-xs uppercase tracking-widest font-semibold text-text-muted/80 mt-1 block">
            — Marcus Tullius Cicero
          </span>
        </div>
      </div>

      {/* Backend Health Probe Status */}
      <ApiHealthStatus />

      {/* Curated Architectural Plates */}
      <div>
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-border">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-text">
              Craft & Engineering Highlights
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Engineered with modern full-stack rigor and meticulous typographic taste.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted font-medium">
            <Library className="w-4 h-4 text-primary" />
            <span>Open Specification</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {architectureHighlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <Card key={i} className="p-6 flex gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-bold font-serif text-text text-base">{h.title}</h3>
                    <Badge variant="neutral">{h.tag}</Badge>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{h.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
