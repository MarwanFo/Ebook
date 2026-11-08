import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ShieldCheck, Database, Layers, Sparkles } from 'lucide-react';
import { BookQueryDto, BookSummaryDto } from '@bookflow/shared-types';
import { useAuthStore } from '../features/auth/stores/auth-store';
import { useBooks } from '../features/books/hooks/useBooks';
import { useDeleteBook } from '../features/books/hooks/useDeleteBook';
import { LibraryFilters } from '../features/books/components/LibraryFilters';
import { BookGrid } from '../features/books/components/BookGrid';
import { UploadModal } from '../features/books/components/UploadModal';
import { BookDetailModal } from '../features/books/components/BookDetailModal';
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

  const { data: booksData, isLoading: isBooksLoading } = useBooks(
    isAuthenticated ? filters : { page: 1, limit: 1 },
  );
  const deleteMutation = useDeleteBook();

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

  const handleReadBook = (bookId: string) => {
    navigate(`/reader/${bookId}`);
  };

  // If user is logged in, present the Ebook Library Catalog
  if (isAuthenticated) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Library Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              Welcome back, {user?.displayName || user?.email.split('@')[0]}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Browse your digital collection, resume reading, or add new books.
            </p>
          </div>
          <div className="mt-3 md:mt-0 flex items-center gap-2">
            <span className="text-xs text-text-muted bg-surface-muted px-3 py-1.5 rounded-lg border border-border">
              {booksData?.meta.pagination.total ?? 0} books in library
            </span>
          </div>
        </div>

        {/* Filters and Controls */}
        <LibraryFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onUploadClick={() => setIsUploadOpen(true)}
        />

        {/* Books Grid */}
        <BookGrid
          books={booksData?.data || []}
          isLoading={isBooksLoading}
          pagination={booksData?.meta.pagination}
          onPageChange={(page) => handleFilterChange({ page })}
          onSelectBook={(book) => setSelectedBook(book)}
          onDeleteBook={handleDeleteBook}
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
      </div>
    );
  }

  // Guest Landing View
  const architectureHighlights = [
    {
      title: 'NestJS + Prisma API',
      description:
        'Robust REST backend with modular architecture, strict environment validation, request-ID tracking, and PostgreSQL models.',
      icon: Database,
      tag: 'Backend',
    },
    {
      title: 'React + Vite + Tailwind',
      description:
        'Modern client with warm book aesthetics, light/sepia/dark themes, TanStack Query server caching, and Zustand UI state.',
      icon: Sparkles,
      tag: 'Frontend',
    },
    {
      title: 'Shared TypeScript Contracts',
      description:
        'Zero-duplication API envelopes, public DTOs, and domain enums shared between client and server without exposing internal models.',
      icon: Layers,
      tag: 'Packages',
    },
    {
      title: 'Docker & PostgreSQL 16',
      description:
        'Containerized database infrastructure with automated health probes and persistent storage volume mappings.',
      icon: ShieldCheck,
      tag: 'DevOps',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center py-10 px-4 rounded-2xl bg-surface border border-border shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
          <BookOpen className="w-4 h-4" />
          <span>Realistic Ebook Reading Platform</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl font-serif">
          Read with Focus, Depth, and Authenticity
        </h1>
        <p className="mt-4 text-base text-text-muted max-w-2xl mx-auto leading-relaxed">
          BookFlow brings the tactile feel of physical books into the browser with true two-page
          spreads, EPUB & PDF support, and cross-device reading progress.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            to="/register"
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-contrast font-medium text-sm hover:bg-primary-hover shadow-sm transition-all"
          >
            Create Free Account
          </Link>
          <Link
            to="/login"
            className="px-6 py-2.5 rounded-xl border border-border bg-surface text-text font-medium text-sm hover:bg-surface-muted transition-all"
          >
            Sign In to Library
          </Link>
        </div>
      </div>

      {/* Backend Health Probe Status */}
      <ApiHealthStatus />

      {/* Architecture Highlights Grid */}
      <div>
        <h2 className="text-xl font-bold text-text mb-4">Architecture & Engineering Highlights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {architectureHighlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <Card key={i} className="p-5 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text text-sm">{h.title}</h3>
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
