import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ePubLibrary, { Book, Rendition, Location, NavItem } from 'epubjs';
import { LocationType } from '@bookflow/shared-types';
import { Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { booksApi } from '../../books/services/books-api';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { useUpdateProgress } from '../hooks/useUpdateProgress';
import { usePdfStore } from '../stores/pdf-store';
import { PdfReaderHeader } from './PdfReaderHeader';
import { PdfReaderFooter } from './PdfReaderFooter';
import { PdfReaderTocSidebar, PdfOutlineItem } from './PdfReaderTocSidebar';
import { BookmarksSidebar } from './BookmarksSidebar';
import { useBookmarks } from '../hooks/useBookmarks';
import { FlipBookView } from './FlipBookView';
import { extractEpubPages, ExtractedEpubPage } from '../utils/epub-page-extractor';

const ePub = (
  typeof ePubLibrary === 'function'
    ? ePubLibrary
    : (ePubLibrary as unknown as { default: typeof ePubLibrary }).default
) as typeof ePubLibrary;

interface EpubReaderProps {
  bookId: string;
  bookTitle: string;
  author?: string | null;
}

export const EpubReader: React.FC<EpubReaderProps> = ({ bookId, bookTitle, author }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Unified Reader Store (Shared with PDF reader for 100% design consistency)
  const { zoom, zoomMode, viewMode, theme, rotation } = usePdfStore();

  // Backend Sync
  const { data: savedProgress, isLoading: isProgressLoading } = useReadingProgress(bookId);
  const { data: bookmarks = [] } = useBookmarks(bookId);
  const updateProgressMutation = useUpdateProgress(bookId);

  // Reader Local State
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);

  // 3D FlipBook Extracted Pages
  const [epubPages, setEpubPages] = useState<ExtractedEpubPage[]>([]);

  // Overlay Panels
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen Handler
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Compute Outline for Table of Contents Sidebar
  const outline: PdfOutlineItem[] = useMemo(() => {
    if (toc.length > 0 && epubPages.length > 0) {
      return toc.map((item, idx) => {
        const cleanItemHref =
          (item.href || '').split('#')[0]?.replace(/^\/+/g, '').toLowerCase() || '';
        const foundIndex = epubPages.findIndex((p) => {
          if (!p.href) return false;
          const cleanPageHref = p.href.split('#')[0]?.replace(/^\/+/g, '').toLowerCase() || '';
          return (
            cleanPageHref === cleanItemHref ||
            cleanPageHref.endsWith(cleanItemHref) ||
            cleanItemHref.endsWith(cleanPageHref)
          );
        });
        return {
          title: item.label,
          pageNumber: foundIndex >= 0 ? foundIndex + 1 : idx + 1,
        };
      });
    }
    // Fallback outline from extracted chapter titles
    if (epubPages.length > 0) {
      return epubPages.reduce<PdfOutlineItem[]>((acc, page, idx) => {
        if (page.chapterTitle && !acc.some((o) => o.title === page.chapterTitle)) {
          acc.push({
            title: page.chapterTitle,
            pageNumber: idx + 1,
          });
        }
        return acc;
      }, []);
    }
    return [];
  }, [epubPages, toc]);

  // Jump to specific page number
  const handleJumpToPage = useCallback(
    (pageNum: number) => {
      const maxPage = Math.max(1, totalPages || epubPages.length || 1);
      const target = Math.max(1, Math.min(maxPage, pageNum));
      setCurrentPage(target);

      if (epubPages.length > 0) {
        const pageData = epubPages[target - 1];
        if (pageData?.chapterTitle) {
          setCurrentChapter(pageData.chapterTitle);
        }
        if (renditionRef.current && pageData?.href) {
          renditionRef.current.display(pageData.href).catch(() => {});
        }
      }
    },
    [epubPages, totalPages],
  );

  // Handle FlipBook page turn change
  const handleFlipPageChange = useCallback(
    (page: number) => {
      handleJumpToPage(page);
      const maxPages = totalPages || epubPages.length || 1;
      const pct = Math.min(100, Math.max(0, Math.round((page / maxPages) * 100)));
      setProgressPercentage(pct);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        updateProgressMutation.mutate({
          locationType: LocationType.EPUB_CFI,
          locationValue: epubPages[page - 1]?.href || String(page),
          progressPercentage: pct,
          currentPage: page,
          totalPages: maxPages,
          settings: {
            theme,
            zoom,
            zoomMode,
            viewMode,
            rotation,
          },
        });
      }, 1500);
    },
    [
      epubPages,
      handleJumpToPage,
      rotation,
      theme,
      totalPages,
      updateProgressMutation,
      viewMode,
      zoom,
      zoomMode,
    ],
  );

  // Jump to specific CFI or location
  const handleJumpToLocation = useCallback(
    (_locType: LocationType, locValue: string) => {
      const parsed = parseInt(locValue, 10);
      if (!isNaN(parsed)) {
        handleJumpToPage(parsed);
      } else if (renditionRef.current) {
        renditionRef.current.display(locValue).catch(() => {});
      }
    },
    [handleJumpToPage],
  );

  // Next / Prev standard handlers for non-flipbook modes
  const handlePrev = useCallback(() => {
    if (viewMode === 'flipbook') {
      handleJumpToPage(Math.max(1, currentPage - 1));
    } else if (renditionRef.current) {
      renditionRef.current.prev();
    }
  }, [currentPage, handleJumpToPage, viewMode]);

  const handleNext = useCallback(() => {
    if (viewMode === 'flipbook') {
      const maxPages = totalPages || epubPages.length || 1;
      handleJumpToPage(Math.min(maxPages, currentPage + 1));
    } else if (renditionRef.current) {
      renditionRef.current.next();
    }
  }, [currentPage, epubPages.length, handleJumpToPage, totalPages, viewMode]);

  // Main EPUB Initialization
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingBook(true);
    setLoadError(null);

    async function initEpub() {
      try {
        if (!viewerRef.current) return;

        // Fetch Book Binary
        const arrayBuffer = await booksApi.getBookFileArrayBuffer(bookId);
        if (isCancelled) return;

        // Initialize EPUB Book
        const book = ePub(arrayBuffer);
        bookRef.current = book;

        // Extract FlipBook pages asynchronously
        extractEpubPages(book, bookTitle, author)
          .then((extracted) => {
            if (!isCancelled && extracted.length > 0) {
              setEpubPages(extracted);
              setTotalPages(extracted.length);
              setIsLoadingBook(false);
              if (savedProgress?.currentPage && savedProgress.currentPage >= 1) {
                setCurrentPage(Math.min(extracted.length, savedProgress.currentPage));
              }
            }
          })
          .catch((err) => {
            console.warn('FlipBook page extraction error:', err);
            if (!isCancelled) {
              setIsLoadingBook(false);
            }
          });

        // Extract Table of Contents
        book.loaded.navigation.then((nav) => {
          if (!isCancelled && nav && nav.toc) {
            setToc(nav.toc);
          }
        });

        // Configure Rendition for standard spread fallback
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'always',
          minSpreadWidth: 800,
          flow: 'paginated',
        });
        renditionRef.current = rendition;

        // Display start target in background
        const startTarget = savedProgress?.locationValue || undefined;
        rendition.display(startTarget).catch(() => {});

        // Listen for relocated events
        rendition.on('relocated', (location: Location) => {
          if (!isCancelled && location && location.start) {
            setCurrentCfi(location.start.cfi);
          }
        });
      } catch (err: unknown) {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load EPUB document.';
          console.error('Failed to initialize EPUB engine:', err);
          setLoadError(message);
          setIsLoadingBook(false);
        }
      }
    }

    initEpub();

    return () => {
      isCancelled = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch {
          // Rendition destroy safety
        }
        renditionRef.current = null;
      }
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch {
          // Book destroy safety
        }
        bookRef.current = null;
      }
    };
  }, [author, bookId, bookTitle, savedProgress?.currentPage, savedProgress?.locationValue]);

  // Synchronize rendition spread when viewMode changes
  useEffect(() => {
    if (renditionRef.current) {
      try {
        const spreadSetting = viewMode === 'single-page' ? 'none' : 'always';
        (renditionRef.current as unknown as { spread?: (val: string) => void }).spread?.(
          spreadSetting,
        );
      } catch {
        // safe fallback
      }
    }
  }, [viewMode]);

  const isFlipBook = viewMode === 'flipbook';
  const effectiveTotalPages = totalPages || epubPages.length || 1;

  const canvasBgClass = isFlipBook
    ? 'bg-[#1b110a] text-neutral-100'
    : {
        light: 'bg-white text-neutral-900',
        sepia: 'bg-[#f5edd6] text-[#4a3b2c]',
        dark: 'bg-[#121110] text-[#e4e2dd]',
      }[theme];

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden select-none ${canvasBgClass}`}>
      {/* 1. Top Header Bar (100% Identical to PDF Reader Header) */}
      <PdfReaderHeader
        title={bookTitle}
        author={author}
        currentPage={currentPage}
        totalPages={effectiveTotalPages}
        onJumpToPage={handleJumpToPage}
        isTocOpen={isTocOpen}
        onToggleToc={() => {
          setIsTocOpen(!isTocOpen);
          setIsBookmarksOpen(false);
        }}
        isThumbnailsOpen={false}
        onToggleThumbnails={() => {}}
        isBookmarksOpen={isBookmarksOpen}
        onToggleBookmarks={() => {
          setIsBookmarksOpen(!isBookmarksOpen);
          setIsTocOpen(false);
        }}
        bookmarkCount={bookmarks.length}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* 2. Main Reading Canvas Stage */}
      <main
        className={`relative flex-1 w-full flex items-center justify-center ${
          isFlipBook ? 'p-0 overflow-hidden' : 'p-4 sm:p-6 overflow-auto'
        }`}
      >
        {/* Loading Spinner */}
        {(isLoadingBook || isProgressLoading) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-inherit backdrop-blur-xs">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-3" />
            <p className="text-xs font-medium opacity-75">Loading book in 3D Mode...</p>
          </div>
        )}

        {/* Error Fallback */}
        {loadError && (
          <div className="p-8 max-w-md text-center z-20 animate-fade-in">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold mb-1">Failed to Open Book</h3>
            <p className="text-xs opacity-75 mb-4 leading-relaxed">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* Real 3D FlipBook View (Default Mode) */}
        {isFlipBook && !isLoadingBook && !loadError && (
          <div className="w-full h-full p-0 overflow-hidden">
            <FlipBookView
              title={bookTitle}
              author={author}
              totalPages={effectiveTotalPages}
              pages={epubPages}
              currentPage={currentPage}
              onPageChange={handleFlipPageChange}
              theme={theme}
            />
          </div>
        )}

        {/* Standard EPUB Render Container (When user switches view mode to two-page or single-page) */}
        <div
          ref={viewerRef}
          className={
            isFlipBook
              ? 'absolute inset-0 pointer-events-none opacity-0 -z-10'
              : 'w-full h-full max-w-6xl mx-auto relative px-2 sm:px-6 md:px-12 py-2'
          }
          style={{ minHeight: '100%' }}
        />

        {/* Center Book Spine Divider Shadow (for standard two-page spread view) */}
        {!isFlipBook && viewMode !== 'single-page' && (
          <div
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none opacity-20 hidden md:block"
            style={{
              background:
                'linear-gradient(to right, rgba(0,0,0,0.06), rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.06))',
            }}
          />
        )}

        {/* Left Navigation Button (Standard View) */}
        {!isFlipBook && !isLoadingBook && !loadError && (
          <button
            type="button"
            onClick={handlePrev}
            className="hidden md:flex absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-neutral-900/60 hover:bg-neutral-900/90 text-amber-200 border border-neutral-700/60 backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="Previous Page (Left Arrow)"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Navigation Button (Standard View) */}
        {!isFlipBook && !isLoadingBook && !loadError && (
          <button
            type="button"
            onClick={handleNext}
            className="hidden md:flex absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-neutral-900/60 hover:bg-neutral-900/90 text-amber-200 border border-neutral-700/60 backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="Next Page (Right Arrow / Space)"
            aria-label="Next Page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </main>

      {/* 3. Footer Navigation Bar (100% Identical to PDF Reader Footer) */}
      <PdfReaderFooter
        currentPage={currentPage}
        totalPages={effectiveTotalPages}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeekPage={handleJumpToPage}
        theme={theme}
      />

      {/* 4. Table of Contents / Outline Drawer */}
      <PdfReaderTocSidebar
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        outline={outline}
        currentPage={currentPage}
        onSelectPage={handleJumpToPage}
        theme={theme}
      />

      {/* 5. Bookmarks & Annotations Drawer */}
      <BookmarksSidebar
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookId={bookId}
        bookTitle={bookTitle}
        currentLocationType={LocationType.EPUB_CFI}
        currentLocationValue={currentCfi || String(currentPage)}
        currentProgressPercentage={progressPercentage}
        currentLabel={currentChapter || `Page ${currentPage} of ${effectiveTotalPages}`}
        onJumpToLocation={handleJumpToLocation}
        theme={theme}
      />
    </div>
  );
};
