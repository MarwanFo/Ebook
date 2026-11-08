import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePubLibrary, { Book, Rendition, Location, NavItem } from 'epubjs';
import { LocationType } from '@bookflow/shared-types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { booksApi } from '../../books/services/books-api';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { useUpdateProgress } from '../hooks/useUpdateProgress';
import { useReaderStore } from '../stores/reader-store';
import { ReaderHeader } from './ReaderHeader';
import { ReaderFooter } from './ReaderFooter';
import { ReaderTocSidebar } from './ReaderTocSidebar';
import { ReaderSettingsModal } from './ReaderSettingsModal';

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

  // Reader Preferences Store
  const { theme, fontFamily, fontSize, lineHeight, layout } = useReaderStore();

  // Backend Sync
  const { data: savedProgress, isLoading: isProgressLoading } = useReadingProgress(bookId);
  const updateProgressMutation = useUpdateProgress(bookId);

  // Reader Local State
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number | undefined>(undefined);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  // Overlay Panels
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  // Compute Font Family CSS
  const getFontFamilyCss = (font: string) => {
    switch (font) {
      case 'sans':
        return 'Inter, system-ui, -apple-system, sans-serif !important';
      case 'mono':
        return '"JetBrains Mono", Consolas, monospace !important';
      case 'serif':
      default:
        return 'Merriweather, Georgia, Cambria, serif !important';
    }
  };

  // Apply Theme & Font Rules to Rendition
  const applyStylesToRendition = useCallback(
    (rendition: Rendition) => {
      const themes = rendition.themes;

      // Theme rules
      themes.register('light', {
        body: {
          background: '#ffffff !important',
          color: '#1a1a1a !important',
          'font-family': getFontFamilyCss(fontFamily),
          'font-size': `${fontSize}px !important`,
          'line-height': `${lineHeight} !important`,
          padding: '0 24px !important',
        },
        p: { 'line-height': `${lineHeight} !important`, 'margin-bottom': '1em !important' },
        a: { color: '#b45309 !important', 'text-decoration': 'underline' },
      });

      themes.register('sepia', {
        body: {
          background: '#f5edd6 !important',
          color: '#4a3b2c !important',
          'font-family': getFontFamilyCss(fontFamily),
          'font-size': `${fontSize}px !important`,
          'line-height': `${lineHeight} !important`,
          padding: '0 24px !important',
        },
        p: { 'line-height': `${lineHeight} !important`, 'margin-bottom': '1em !important' },
        a: { color: '#92400e !important', 'text-decoration': 'underline' },
      });

      themes.register('dark', {
        body: {
          background: '#121110 !important',
          color: '#e2e8f0 !important',
          'font-family': getFontFamilyCss(fontFamily),
          'font-size': `${fontSize}px !important`,
          'line-height': `${lineHeight} !important`,
          padding: '0 24px !important',
        },
        p: { 'line-height': `${lineHeight} !important`, 'margin-bottom': '1em !important' },
        a: { color: '#fbbf24 !important', 'text-decoration': 'underline' },
      });

      themes.select(theme);
      themes.fontSize(`${fontSize}px`);
    },
    [fontFamily, fontSize, lineHeight, theme],
  );

  // Synchronize style updates when preferences change
  useEffect(() => {
    if (renditionRef.current) {
      applyStylesToRendition(renditionRef.current);
    }
  }, [applyStylesToRendition]);

  // Determine Spread Setting
  const getSpreadSetting = useCallback(() => {
    if (layout === 'single-page') return 'none';
    if (layout === 'two-page') return 'always';
    return 'auto';
  }, [layout]);

  // Handle Location Change & Debounced Save
  const handleRelocated = useCallback(
    (location: Location) => {
      if (!location || !location.start) return;

      const cfi = location.start.cfi;
      setCurrentCfi(cfi);

      // Calculate progress percentage
      let pct = 0;
      if (bookRef.current && bookRef.current.locations && bookRef.current.locations.total) {
        pct = bookRef.current.locations.percentageFromCfi(cfi) * 100;
      } else if (typeof location.start.percentage === 'number') {
        pct = location.start.percentage * 100;
      }
      pct = Math.min(100, Math.max(0, pct));
      setProgressPercentage(pct);

      if (location.start.displayed) {
        setCurrentPage(location.start.displayed.page);
        setTotalPages(location.start.displayed.total);
      }

      // Identify current chapter label from TOC
      if (toc.length > 0 && location.start.cfi) {
        const matchingItem = toc.find((item) =>
          item.href ? location.start.cfi.includes(item.href) : false,
        );
        if (matchingItem) {
          setCurrentChapter(matchingItem.label.trim());
        }
      }

      // Debounce saving progress to API (1.5 seconds)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        updateProgressMutation.mutate({
          locationType: LocationType.EPUB_CFI,
          locationValue: cfi,
          progressPercentage: Math.round(pct * 10) / 10,
          currentPage: location.start.displayed?.page,
          totalPages: location.start.displayed?.total,
          settings: {
            theme,
            fontFamily,
            fontSize,
            lineHeight,
            layout,
          },
        });
      }, 1500);
    },
    [fontFamily, fontSize, layout, lineHeight, theme, toc, updateProgressMutation],
  );

  // Page Turn Actions
  const handlePrev = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  }, []);

  const handleNext = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  }, []);

  // Jump to specific TOC href
  const handleSelectChapter = useCallback((href: string) => {
    if (renditionRef.current) {
      renditionRef.current.display(href);
    }
  }, []);

  // Scrub to approximate percentage
  const handleSeekPercentage = useCallback((percentage: number) => {
    if (bookRef.current && bookRef.current.locations && renditionRef.current) {
      try {
        const cfi = bookRef.current.locations.cfiFromPercentage(percentage / 100);
        if (cfi) {
          renditionRef.current.display(cfi);
        }
      } catch {
        // Fallback if locations are still generating
      }
    }
  }, []);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is inside an input or modal is open
      if (isSettingsOpen || isTocOpen) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isSettingsOpen, isTocOpen]);

  // Callbacks ref to maintain current closures without re-triggering main initialization
  const callbacksRef = useRef({
    handleRelocated,
    handleNext,
    handlePrev,
    applyStylesToRendition,
    getSpreadSetting,
    savedProgress,
  });

  useEffect(() => {
    callbacksRef.current = {
      handleRelocated,
      handleNext,
      handlePrev,
      applyStylesToRendition,
      getSpreadSetting,
      savedProgress,
    };
  });

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

        // Extract Table of Contents
        book.loaded.navigation.then((nav) => {
          if (!isCancelled && nav && nav.toc) {
            setToc(nav.toc);
          }
        });

        // Configure Rendition
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: callbacksRef.current.getSpreadSetting(),
          minSpreadWidth: 800,
          flow: 'paginated',
        });
        renditionRef.current = rendition;

        // Apply styles & themes
        callbacksRef.current.applyStylesToRendition(rendition);

        // Bind location change event
        rendition.on('relocated', (location: Location) => {
          if (!isCancelled) {
            callbacksRef.current.handleRelocated(location);
          }
        });

        // Bind keyboard navigation inside EPUB iframe
        rendition.on('keydown', (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            callbacksRef.current.handleNext();
          } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            callbacksRef.current.handlePrev();
          }
        });

        // Determine starting location: saved CFI or beginning
        const startTarget = callbacksRef.current.savedProgress?.locationValue || undefined;

        await rendition.display(startTarget);
        if (isCancelled) return;

        setIsLoadingBook(false);

        // Generate location index in background for precise percentage
        book.ready.then(() => {
          if (!isCancelled) {
            book.locations.generate(1000).catch(() => {});
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
  }, [bookId]); // Run once when bookId mounts

  // Theme-aware Canvas Background
  const canvasBgClass = {
    light: 'bg-white text-neutral-900',
    sepia: 'bg-[#f5edd6] text-[#4a3b2c]',
    dark: 'bg-[#121110] text-[#e4e2dd]',
  }[theme];

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden select-none ${canvasBgClass}`}>
      {/* Top Header Bar */}
      <ReaderHeader
        title={bookTitle}
        author={author}
        chapterTitle={currentChapter}
        theme={theme}
        isTocOpen={isTocOpen}
        onToggleToc={() => setIsTocOpen(!isTocOpen)}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Reading Stage */}
      <main className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
        {/* Loading Spinner */}
        {(isLoadingBook || isProgressLoading) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-inherit backdrop-blur-xs">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-3" />
            <p className="text-xs font-medium opacity-75">Opening book...</p>
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

        {/* EPUB Render Canvas Container */}
        <div
          ref={viewerRef}
          className="w-full h-full max-w-6xl mx-auto relative px-2 sm:px-6 md:px-12 py-2"
          style={{ minHeight: '100%' }}
        />

        {/* Center Book Spine Divider Shadow (for two-page spread authenticity) */}
        {layout !== 'single-page' && (
          <div
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none opacity-20 hidden md:block"
            style={{
              background:
                'linear-gradient(to right, rgba(0,0,0,0.06), rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.06))',
            }}
          />
        )}

        {/* Invisible Click Margins for Quick Page Turns */}
        {!isLoadingBook && !loadError && (
          <>
            <div
              onClick={handlePrev}
              className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 cursor-w-resize z-10 opacity-0 hover:opacity-10 transition-opacity bg-black"
              title="Previous Page"
              aria-label="Previous Page"
            />
            <div
              onClick={handleNext}
              className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 cursor-e-resize z-10 opacity-0 hover:opacity-10 transition-opacity bg-black"
              title="Next Page"
              aria-label="Next Page"
            />
          </>
        )}
      </main>

      {/* Bottom Footer Control Bar */}
      <ReaderFooter
        percentage={progressPercentage}
        currentPage={currentPage}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeekPercentage={handleSeekPercentage}
        theme={theme}
      />

      {/* Table of Contents Drawer */}
      <ReaderTocSidebar
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        toc={toc}
        currentHref={currentCfi}
        onSelectChapter={handleSelectChapter}
        theme={theme}
      />

      {/* Reader Settings Modal */}
      <ReaderSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
