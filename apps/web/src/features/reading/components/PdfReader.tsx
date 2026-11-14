import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { LocationType } from '@bookflow/shared-types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { booksApi } from '../../books/services/books-api';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { useUpdateProgress } from '../hooks/useUpdateProgress';
import { usePdfStore } from '../stores/pdf-store';
import { PdfReaderHeader } from './PdfReaderHeader';
import { PdfReaderFooter } from './PdfReaderFooter';
import { PdfReaderTocSidebar, PdfOutlineItem } from './PdfReaderTocSidebar';
import { PdfThumbnailsSidebar } from './PdfThumbnailsSidebar';
import { BookmarksSidebar } from './BookmarksSidebar';
import { useBookmarks } from '../hooks/useBookmarks';
import { FlipBookView } from './FlipBookView';

// Assign PDF.js worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface RawOutlineItem {
  title: string;
  dest?: string | unknown[] | null;
  items?: RawOutlineItem[];
}

interface PdfRefProxy {
  num: number;
  gen: number;
}

interface PdfReaderProps {
  bookId: string;
  bookTitle: string;
  author?: string | null;
}

interface FlipBookErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface FlipBookErrorBoundaryState {
  hasError: boolean;
}

class FlipBookErrorBoundary extends React.Component<
  FlipBookErrorBoundaryProps,
  FlipBookErrorBoundaryState
> {
  constructor(props: FlipBookErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): FlipBookErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('FlipBook encountered an error, falling back:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const PdfReader: React.FC<PdfReaderProps> = ({ bookId, bookTitle, author }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const leftRenderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const rightRenderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Store & API
  const { zoom, zoomMode, viewMode, setViewMode, theme, rotation } = usePdfStore();

  const { data: savedProgress, isLoading: isProgressLoading } = useReadingProgress(bookId);
  const { data: bookmarks = [] } = useBookmarks(bookId);
  const updateProgressMutation = useUpdateProgress(bookId);

  const savedProgressRef = useRef(savedProgress);
  useEffect(() => {
    savedProgressRef.current = savedProgress;
  }, [savedProgress]);

  // Reader Local State
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [outline, setOutline] = useState<PdfOutlineItem[]>([]);

  // Overlays
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
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

  // Compute Page Progress and Debounce Save
  const persistPageProgress = useCallback(
    (page: number, total: number) => {
      if (total <= 0) return;
      const pct = Math.min(100, Math.max(0, Math.round((page / total) * 100)));

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        updateProgressMutation.mutate({
          locationType: LocationType.PDF_PAGE,
          locationValue: String(page),
          progressPercentage: pct,
          currentPage: page,
          totalPages: total,
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
    [rotation, theme, updateProgressMutation, viewMode, zoom, zoomMode],
  );

  // Navigate to Page
  const goToPage = useCallback(
    (pageNum: number) => {
      if (!pdfDoc || totalPages <= 0) return;
      const target = Math.max(1, Math.min(totalPages, pageNum));
      setCurrentPage(target);
      persistPageProgress(target, totalPages);
    },
    [pdfDoc, persistPageProgress, totalPages],
  );

  // Stepper Handlers
  const handleNext = useCallback(() => {
    if (viewMode === 'two-page') {
      goToPage(currentPage + 2);
    } else {
      goToPage(currentPage + 1);
    }
  }, [currentPage, goToPage, viewMode]);

  const handlePrev = useCallback(() => {
    if (viewMode === 'two-page') {
      goToPage(currentPage - 2);
    } else {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage, viewMode]);

  // Keyboard navigation
  useEffect(() => {
    if (viewMode === 'flipbook') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTocOpen || isThumbnailsOpen) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        e.key === ' '
      ) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isThumbnailsOpen, isTocOpen, viewMode]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingDocument(true);
    setLoadError(null);

    async function loadPdf() {
      try {
        const arrayBuffer = await booksApi.getBookFileArrayBuffer(bookId);
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);

        // Determine starting page: saved progress or beginning
        let startPage = 1;
        const currentSaved = savedProgressRef.current;
        if (currentSaved?.currentPage && currentSaved.currentPage >= 1) {
          startPage = Math.min(doc.numPages, currentSaved.currentPage);
        } else if (currentSaved?.locationValue) {
          const parsed = parseInt(currentSaved.locationValue, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            startPage = Math.min(doc.numPages, parsed);
          }
        }
        setCurrentPage(startPage);

        // Extract Document Outline (TOC)
        try {
          const rawOutline = (await doc.getOutline()) as RawOutlineItem[] | null;
          if (rawOutline && !isCancelled) {
            const mappedOutline = await Promise.all(
              rawOutline.map(async (item: RawOutlineItem) => {
                let pageNumber = 1;
                if (typeof item.dest === 'string') {
                  const dest = await doc.getDestination(item.dest);
                  if (dest && dest[0]) {
                    const pageIndex = await doc.getPageIndex(dest[0] as unknown as PdfRefProxy);
                    pageNumber = pageIndex + 1;
                  }
                } else if (Array.isArray(item.dest) && item.dest[0]) {
                  const pageIndex = await doc.getPageIndex(item.dest[0] as unknown as PdfRefProxy);
                  pageNumber = pageIndex + 1;
                }
                return {
                  title: item.title,
                  pageNumber,
                };
              }),
            );
            setOutline(mappedOutline);
          }
        } catch {
          // Outline parsing optional
        }

        setIsLoadingDocument(false);
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('Failed to load PDF document:', err);
          const message = err instanceof Error ? err.message : 'Failed to load PDF file.';
          setLoadError(message);
          setIsLoadingDocument(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [bookId]);

  // Compute Scale based on container and zoomMode
  const computeScale = useCallback(
    (pageWidth: number, pageHeight: number, isTwoPage: boolean) => {
      if (!containerRef.current) return zoom;
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      const containerHeight = containerRef.current.clientHeight - 48;

      if (zoomMode === 'fit-width') {
        const availableWidth = isTwoPage ? containerWidth / 2 : containerWidth;
        return availableWidth / pageWidth;
      }
      if (zoomMode === 'fit-page') {
        return containerHeight / pageHeight;
      }
      return zoom;
    },
    [zoom, zoomMode],
  );

  // Render Page onto Canvas
  const renderPageToCanvas = useCallback(
    async (
      pageNum: number,
      canvas: HTMLCanvasElement,
      renderTaskRef: React.MutableRefObject<pdfjsLib.RenderTask | null>,
      isTwoPage: boolean,
    ) => {
      if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        const scale = computeScale(unscaledViewport.width, unscaledViewport.height, isTwoPage);
        const viewport = page.getViewport({ scale, rotation });

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvas,
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: unknown) {
        const errorObj = err as { name?: string };
        if (errorObj?.name !== 'RenderingCancelledException') {
          console.error(`Failed to render PDF page ${pageNum}:`, err);
        }
      }
    },
    [computeScale, pdfDoc, rotation, totalPages],
  );

  // Determine whether to use two-page spread
  const isEffectiveTwoPage =
    viewMode === 'two-page' &&
    (typeof window !== 'undefined' ? window.innerWidth >= 900 : true) &&
    totalPages > 1;

  // Active page numbers for spread
  const leftPageNum = isEffectiveTwoPage
    ? currentPage % 2 === 0
      ? currentPage - 1
      : currentPage
    : currentPage;
  const rightPageNum = isEffectiveTwoPage ? leftPageNum + 1 : null;

  // Main Render Effect
  useEffect(() => {
    if (!pdfDoc || isLoadingDocument) return;

    if (leftCanvasRef.current) {
      renderPageToCanvas(leftPageNum, leftCanvasRef.current, leftRenderTaskRef, isEffectiveTwoPage);
    }

    if (rightCanvasRef.current && rightPageNum && rightPageNum <= totalPages) {
      renderPageToCanvas(
        rightPageNum,
        rightCanvasRef.current,
        rightRenderTaskRef,
        isEffectiveTwoPage,
      );
    }
  }, [
    currentPage,
    isEffectiveTwoPage,
    isLoadingDocument,
    leftPageNum,
    pdfDoc,
    renderPageToCanvas,
    rightPageNum,
    rotation,
    totalPages,
    viewMode,
    zoom,
    zoomMode,
  ]);

  // Theme-aware Canvas Background
  const canvasBgClass = {
    light: 'bg-neutral-100 text-neutral-900',
    sepia: 'bg-[#f5edd6] text-[#4a3b2c]',
    dark: 'bg-[#121110] text-[#e4e2dd]',
  }[theme];

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden select-none ${canvasBgClass}`}>
      {/* PDF Header Controls */}
      <PdfReaderHeader
        title={bookTitle}
        author={author}
        currentPage={currentPage}
        totalPages={totalPages}
        onJumpToPage={goToPage}
        isTocOpen={isTocOpen}
        onToggleToc={() => {
          setIsTocOpen(!isTocOpen);
          setIsThumbnailsOpen(false);
          setIsBookmarksOpen(false);
        }}
        isThumbnailsOpen={isThumbnailsOpen}
        onToggleThumbnails={() => {
          setIsThumbnailsOpen(!isThumbnailsOpen);
          setIsTocOpen(false);
          setIsBookmarksOpen(false);
        }}
        isBookmarksOpen={isBookmarksOpen}
        onToggleBookmarks={() => {
          setIsBookmarksOpen(!isBookmarksOpen);
          setIsTocOpen(false);
          setIsThumbnailsOpen(false);
        }}
        bookmarkCount={bookmarks.length}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Viewing Canvas Stage */}
      <main
        ref={containerRef}
        className={`relative flex-1 w-full flex items-center justify-center ${
          viewMode === 'flipbook' ? 'p-1 sm:p-2 overflow-hidden' : 'p-4 sm:p-6 overflow-auto'
        }`}
      >
        {/* Loading Spinner */}
        {(isLoadingDocument || isProgressLoading) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-inherit backdrop-blur-xs">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-3" />
            <p className="text-xs font-medium opacity-75">Loading PDF document...</p>
          </div>
        )}

        {/* Error Fallback */}
        {loadError && (
          <div className="p-8 max-w-md text-center z-20 animate-fade-in">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold mb-1">Failed to Open PDF</h3>
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

        {/* Interactive 3D FlipBook View */}
        {viewMode === 'flipbook' && !isLoadingDocument && !loadError && (
          <FlipBookErrorBoundary
            fallback={
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
                <p className="text-xs opacity-75 mb-3 font-serif">
                  Switching to two-page spread view...
                </p>
                <button
                  type="button"
                  onClick={() => setViewMode('two-page')}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow"
                >
                  Switch to Spread View
                </button>
              </div>
            }
          >
            <FlipBookView
              title={bookTitle}
              author={author}
              totalPages={totalPages}
              pdfDoc={pdfDoc}
              currentPage={currentPage}
              onPageChange={(page) => goToPage(page)}
              theme={theme}
            />
          </FlipBookErrorBoundary>
        )}

        {/* Standard Spread / Page Canvas Container */}
        {viewMode !== 'flipbook' && !isLoadingDocument && !loadError && (
          <div className="flex items-center justify-center shadow-2xl rounded-lg overflow-hidden relative">
            {/* Left Page (or Single Page) */}
            <div className="relative bg-white shadow-md">
              <canvas ref={leftCanvasRef} className="block" />
            </div>

            {/* Center Book Spine Divider (for Two-Page Spread view) */}
            {isEffectiveTwoPage && rightPageNum && rightPageNum <= totalPages && (
              <div
                className="w-4 h-full self-stretch pointer-events-none z-10 opacity-30"
                style={{
                  background:
                    'linear-gradient(to right, rgba(0,0,0,0.15), rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.15))',
                }}
              />
            )}

            {/* Right Page (Two-Page Spread only) */}
            {isEffectiveTwoPage && rightPageNum && rightPageNum <= totalPages && (
              <div className="relative bg-white shadow-md">
                <canvas ref={rightCanvasRef} className="block" />
              </div>
            )}
          </div>
        )}

        {/* Invisible Click Margins for Quick Page Turns (Standard mode) */}
        {viewMode !== 'flipbook' && !isLoadingDocument && !loadError && (
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

      {/* Footer Navigation Bar */}
      <PdfReaderFooter
        currentPage={currentPage}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeekPage={goToPage}
        theme={theme}
      />

      {/* Outline Drawer */}
      <PdfReaderTocSidebar
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        outline={outline}
        currentPage={currentPage}
        onSelectPage={goToPage}
        theme={theme}
      />

      {/* Thumbnails Drawer */}
      <PdfThumbnailsSidebar
        isOpen={isThumbnailsOpen}
        onClose={() => setIsThumbnailsOpen(false)}
        totalPages={totalPages}
        currentPage={currentPage}
        onSelectPage={goToPage}
        theme={theme}
      />

      {/* Bookmarks & Annotations Drawer */}
      <BookmarksSidebar
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookId={bookId}
        bookTitle={bookTitle}
        currentLocationType={LocationType.PDF_PAGE}
        currentLocationValue={String(currentPage)}
        currentProgressPercentage={totalPages > 0 ? (currentPage / totalPages) * 100 : 0}
        currentLabel={`Page ${currentPage} of ${totalPages}`}
        onJumpToLocation={(_locType, locValue) => {
          const parsed = parseInt(locValue, 10);
          if (!isNaN(parsed)) {
            goToPage(parsed);
          }
        }}
        theme={theme}
      />
    </div>
  );
};
