import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Compass,
  Search,
  Plus,
  Check,
  BookOpen,
  Flame,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Library,
} from 'lucide-react';
import { PublicBookDto } from '@bookflow/shared-types';
import { useAuthStore } from '../features/auth/stores/auth-store';
import { useBooks } from '../features/books/hooks/useBooks';
import { useExploreBooks } from '../features/books/hooks/useExploreBooks';
import { useImportPublicBook } from '../features/books/hooks/useImportPublicBook';
import { RealisticBookCover } from '../features/books/components/RealisticBookCover';

const TOPIC_PRESETS = [
  { label: 'All Popular', value: '' },
  { label: 'Classics', value: 'classic' },
  { label: 'Fiction', value: 'fiction' },
  { label: 'Philosophy', value: 'philosophy' },
  { label: 'Mystery', value: 'detective' },
  { label: 'Sci-Fi', value: 'science fiction' },
  { label: 'Adventure', value: 'adventure' },
  { label: 'Gothic', value: 'gothic' },
  { label: 'Romance', value: 'romance' },
  { label: 'Poetry', value: 'poetry' },
];

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { status } = useAuthStore();
  const isAuthenticated = status === 'authenticated';

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [recentlyImported, setRecentlyImported] = useState<Record<number, string>>({}); // gutenbergId -> userBookId
  const [importError, setImportError] = useState<string | null>(null);

  // Fetch explore books
  const { data: exploreData, isLoading, isFetching } = useExploreBooks({
    page: currentPage,
    search: debouncedSearch || undefined,
    topic: selectedTopic || undefined,
  });

  // Fetch user's existing books to flag books already in their library
  const { data: userBooksData } = useBooks(
    { limit: 100 },
    { enabled: isAuthenticated },
  );

  const importMutation = useImportPublicBook();

  // Extract user's existing book titles for deduplication comparison
  const userBookList = Array.isArray(userBooksData)
    ? userBooksData
    : Array.isArray(userBooksData?.data)
      ? userBooksData.data
      : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setDebouncedSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleTopicClick = (topicVal: string) => {
    setSelectedTopic(topicVal);
    setCurrentPage(1);
  };

  const handleImportBook = async (book: PublicBookDto) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/explore');
      return;
    }

    setImportError(null);
    setImportingId(book.id);

    try {
      const response = await importMutation.mutateAsync({
        gutenbergId: book.id,
        title: book.title,
        author: book.authors[0] || null,
        description: book.subjects.length > 0 ? `Subjects: ${book.subjects.join(', ')}` : null,
        coverUrl: book.coverUrl,
        downloadUrl: book.downloadUrl,
      });

      setRecentlyImported((prev) => ({
        ...prev,
        [book.id]: response.book.id,
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to import book. Please try again.';
      setImportError(`Could not add "${book.title}": ${message}`);
    } finally {
      setImportingId(null);
    }
  };

  const books = exploreData?.results || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-paper-200 dark:border-paper-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>Public Library Catalog</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-ink-900 dark:text-paper-50 tracking-tight">
            Discover & Add Books
          </h1>
          <p className="text-sm text-ink-600 dark:text-paper-400 mt-1 max-w-2xl leading-relaxed">
            Browse timeless public-domain masterpieces. Click <strong>Add to Library</strong> to
            instantly save them to your personal collection and read them in the 3D realistic reader.
          </p>
        </div>

        {isAuthenticated && (
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-paper-300 dark:border-paper-700 hover:bg-paper-100 dark:hover:bg-paper-800 text-xs font-medium text-ink-800 dark:text-paper-200 transition-colors shadow-xs"
          >
            <Library className="w-4 h-4 text-brand-500" />
            <span>My Personal Library</span>
          </Link>
        )}
      </div>

      {/* Search & Topic Filters */}
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 dark:text-paper-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, author, or keyword (e.g. Frankenstein, Sherlock Holmes, Jane Austen)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-paper-300 dark:border-paper-700 bg-white dark:bg-paper-900 text-sm text-ink-900 dark:text-paper-100 placeholder-ink-400 dark:placeholder-paper-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 transition-all shadow-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 dark:hover:text-paper-200 p-0.5"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-xs transition-colors"
          >
            Search
          </button>
        </form>

        {/* Quick Topic Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-ink-500 dark:text-paper-400 mr-1">
            Genres:
          </span>
          {TOPIC_PRESETS.map((t) => {
            const isSelected = selectedTopic === t.value;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => handleTopicClick(t.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'bg-paper-100 dark:bg-paper-900 text-ink-700 dark:text-paper-300 hover:bg-paper-200 dark:hover:bg-paper-800'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {importError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
          <span>{importError}</span>
          <button
            type="button"
            onClick={() => setImportError(null)}
            className="text-red-600 dark:text-red-400 hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading Skeleton / Spinner */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col space-y-3 p-3 rounded-xl border border-paper-200 dark:border-paper-800 bg-white/50 dark:bg-paper-900/50 animate-pulse"
            >
              <div className="w-full aspect-[2/3] bg-paper-200 dark:bg-paper-800 rounded-lg" />
              <div className="h-4 bg-paper-200 dark:bg-paper-800 rounded-md w-3/4" />
              <div className="h-3 bg-paper-200 dark:bg-paper-800 rounded-md w-1/2" />
              <div className="h-8 bg-paper-200 dark:bg-paper-800 rounded-xl w-full mt-auto" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white dark:bg-paper-900 rounded-2xl border border-paper-200 dark:border-paper-800 space-y-4">
          <BookOpen className="w-12 h-12 text-ink-300 dark:text-paper-600 mx-auto" />
          <h3 className="text-base font-serif font-bold text-ink-900 dark:text-paper-100">
            No public books found
          </h3>
          <p className="text-xs text-ink-600 dark:text-paper-400 max-w-sm mx-auto">
            Try adjusting your search terms or selecting a different genre above.
          </p>
          <button
            type="button"
            onClick={handleClearSearch}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors shadow-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Books Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {books.map((book) => {
            const isImporting = importingId === book.id;
            const importedBookId = recentlyImported[book.id];
            const alreadyInLibrary =
              Boolean(importedBookId) ||
              userBookList.some(
                (ub) => ub.title.trim().toLowerCase() === book.title.trim().toLowerCase(),
              );

            const existingBook = userBookList.find(
              (ub) => ub.title.trim().toLowerCase() === book.title.trim().toLowerCase(),
            );
            const targetReaderId = importedBookId || existingBook?.id;

            return (
              <div
                key={book.id}
                className="group flex flex-col bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl p-3 shadow-xs hover:shadow-md transition-all duration-300"
              >
                {/* Book Cover with Realistic 3D Styling */}
                <div className="w-full aspect-[2/3] mb-3 relative overflow-hidden rounded-md shadow-sm">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <RealisticBookCover
                      title={book.title}
                      author={book.authors[0]}
                      className="w-full h-full"
                    />
                  )}

                  {/* Download count badge */}
                  {book.downloadCount > 0 && (
                    <div className="absolute top-1.5 right-1.5 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-[10px] font-mono text-amber-200 font-medium flex items-center gap-1 shadow-xs pointer-events-none">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span>{book.downloadCount > 1000 ? `${Math.round(book.downloadCount / 1000)}k` : book.downloadCount}</span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex-1 flex flex-col min-w-0 mb-3">
                  <h3
                    className="font-serif font-bold text-sm text-ink-900 dark:text-paper-100 line-clamp-2 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
                    title={book.title}
                  >
                    {book.title}
                  </h3>
                  <p
                    className="text-xs text-ink-600 dark:text-paper-400 line-clamp-1 mt-1"
                    title={book.authors.join(', ')}
                  >
                    {book.authors.length > 0 ? book.authors.join(', ') : 'Classic Author'}
                  </p>

                  {/* Primary Subject Tag */}
                  {book.subjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-paper-100 dark:bg-paper-800 text-ink-600 dark:text-paper-400 truncate max-w-full">
                        {book.subjects[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-auto pt-2 border-t border-paper-100 dark:border-paper-800">
                  {alreadyInLibrary ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="inline-flex items-center justify-center gap-1 w-full py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5 stroke-2" />
                        <span>In Your Library</span>
                      </span>
                      {targetReaderId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/reader/${targetReaderId}`)}
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read Now</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={() => handleImportBook(book)}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all ${
                        isImporting
                          ? 'bg-brand-400 text-white cursor-wait opacity-80'
                          : 'bg-brand-500 hover:bg-brand-600 text-white hover:scale-[1.02] active:scale-95'
                      }`}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 stroke-2" />
                          <span>Add to Library</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {exploreData && (exploreData.nextPage || exploreData.previousPage) && (
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-paper-200 dark:border-paper-800">
          <button
            type="button"
            disabled={!exploreData.previousPage || isFetching}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-paper-300 dark:border-paper-700 text-xs font-medium text-ink-700 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-paper-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <span className="text-xs font-medium text-ink-600 dark:text-paper-400">
            Page {currentPage}
          </span>
          <button
            type="button"
            disabled={!exploreData.nextPage || isFetching}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-paper-300 dark:border-paper-700 text-xs font-medium text-ink-700 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-paper-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
