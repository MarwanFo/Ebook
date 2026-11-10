import React, { useRef, useState, useCallback, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react';
import { formatBookTitle } from '../../books/components/RealisticBookCover';

export interface FlipPageData {
  pageNumber: number;
  content?: string;
  canvasDataUrl?: string;
  title?: string;
}

export interface FlipBookViewProps {
  title: string;
  author?: string | null;
  totalPages: number;
  pdfDoc?: pdfjsLib.PDFDocumentProxy | null;
  pages?: FlipPageData[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
  theme?: 'light' | 'sepia' | 'dark';
}

/* -------------------------------------------------------------------------- */
/* Real PDF Page Component (Renders crisp PDF.js canvas with 3D book depth)   */
/* -------------------------------------------------------------------------- */
interface FlipPdfPageProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  theme: 'light' | 'sepia' | 'dark';
  totalPages: number;
  isLeftPage: boolean;
  targetWidth?: number;
  targetHeight?: number;
}

const FlipPdfPage = React.forwardRef<HTMLDivElement, FlipPdfPageProps>((props, ref) => {
  const {
    pageNumber,
    pdfDoc,
    theme,
    totalPages,
    isLeftPage,
    targetWidth = 600,
    targetHeight = 850,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [loading, setLoading] = useState(true);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      if (!canvasRef.current || !pdfDoc) return;
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        setLoading(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled || !canvasRef.current) return;

        // Base unscaled viewport
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // High resolution target scaling so PDF text and charts are big and sharp
        const scaleX = (targetWidth * 1.5) / unscaledViewport.width;
        const scaleY = (targetHeight * 1.5) / unscaledViewport.height;
        const fitScale = Math.min(scaleX, scaleY);

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: fitScale * dpr });

        const canvas = canvasRef.current;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!isCancelled) {
          setIsRendered(true);
          setLoading(false);
        }
      } catch (err: unknown) {
        const errorObj = err as { name?: string };
        if (errorObj?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNumber} render failed:`, err);
          if (!isCancelled) setLoading(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, targetWidth, targetHeight]);

  const pageBgClass = {
    light: 'bg-white',
    sepia: 'bg-[#faf6ee]',
    dark: 'bg-[#1e1c1a]',
  }[theme];

  return (
    <div
      ref={ref}
      className={`w-full h-full ${pageBgClass} relative flex flex-col justify-between overflow-hidden select-none`}
      style={{
        boxShadow: isLeftPage
          ? 'inset -16px 0 24px -10px rgba(0,0,0,0.20), inset -2px 0 6px rgba(0,0,0,0.08)'
          : 'inset 16px 0 24px -10px rgba(0,0,0,0.20), inset 2px 0 6px rgba(0,0,0,0.08)',
      }}
    >
      {/* Deep Center Gutter Binding Shadow */}
      <div
        className={`absolute top-0 bottom-0 pointer-events-none z-20 ${
          isLeftPage ? 'right-0 w-12' : 'left-0 w-12'
        }`}
        style={{
          background: isLeftPage
            ? 'linear-gradient(to left, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.08) 40%, transparent 100%)'
            : 'linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.08) 40%, transparent 100%)',
        }}
      />

      {/* Layered Paper Edge Rim (Simulating pages stacked underneath) */}
      <div
        className={`absolute top-0 bottom-0 pointer-events-none z-10 opacity-70 ${
          isLeftPage
            ? 'left-0 w-2.5 border-r border-black/15 bg-gradient-to-r from-black/15 via-black/5 to-transparent'
            : 'right-0 w-2.5 border-l border-black/15 bg-gradient-to-l from-black/15 via-black/5 to-transparent'
        }`}
      />

      {/* Actual PDF Page Canvas (Scaled large to fill page) */}
      <div className="flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
        {loading && !isRendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-60">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <span className="text-xs font-serif">Rendering page {pageNumber}...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`block max-h-full max-w-full w-auto h-auto object-contain transition-opacity duration-200 ${
            isRendered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Discreet Page Footer */}
      <div className="px-5 py-2 flex items-center justify-between text-[11px] font-serif opacity-70 border-t border-black/5">
        {isLeftPage ? (
          <span>{pageNumber}</span>
        ) : (
          <span className="ml-auto">
            {pageNumber} of {totalPages}
          </span>
        )}
      </div>
    </div>
  );
});
FlipPdfPage.displayName = 'FlipPdfPage';

/* -------------------------------------------------------------------------- */
/* Blank End Page (Used to balance odd page counts in spreads)                */
/* -------------------------------------------------------------------------- */
interface BlankEndPageProps {
  theme: 'light' | 'sepia' | 'dark';
  isLeft?: boolean;
}

const BlankEndPage = React.forwardRef<HTMLDivElement, BlankEndPageProps>((props, ref) => {
  const { theme, isLeft = false } = props;
  const pageBgClass = {
    light: 'bg-[#faf8f5]',
    sepia: 'bg-[#f4ecd8]',
    dark: 'bg-[#1b1917]',
  }[theme];

  return (
    <div
      ref={ref}
      className={`w-full h-full ${pageBgClass} relative flex items-center justify-center overflow-hidden select-none`}
      style={{
        boxShadow: isLeft
          ? 'inset -16px 0 24px -10px rgba(0,0,0,0.20)'
          : 'inset 16px 0 24px -10px rgba(0,0,0,0.20)',
      }}
    >
      <div className="opacity-25 flex flex-col items-center gap-2 font-serif text-text-muted">
        <BookOpen className="w-10 h-10" />
      </div>
    </div>
  );
});
BlankEndPage.displayName = 'BlankEndPage';

/* -------------------------------------------------------------------------- */
/* Soft Flexible Page Component (Fallback when pdfDoc is not present)         */
/* -------------------------------------------------------------------------- */
interface SoftPageProps {
  pageNumber: number;
  total: number;
  theme: 'light' | 'sepia' | 'dark';
  content?: string;
  title?: string;
}

const SoftPage = React.forwardRef<HTMLDivElement, SoftPageProps>((props, ref) => {
  const { pageNumber, total, theme, content, title } = props;
  const isLeftPage = pageNumber % 2 !== 0;

  const themeClasses = {
    light: 'bg-[#faf8f5] text-neutral-800',
    sepia: 'bg-[#f4ecd8] text-[#423321]',
    dark: 'bg-[#1b1917] text-[#e7e5e4]',
  }[theme];

  return (
    <div
      ref={ref}
      className={`w-full h-full ${themeClasses} relative p-6 sm:p-10 flex flex-col justify-between overflow-hidden shadow-sm`}
      style={{
        boxShadow: isLeftPage
          ? 'inset -12px 0 20px -8px rgba(0,0,0,0.12)'
          : 'inset 12px 0 20px -8px rgba(0,0,0,0.12)',
      }}
    >
      {/* Running Book Header */}
      <div className="flex items-center justify-between text-[11px] uppercase font-serif tracking-widest opacity-60 pb-3 border-b border-current/10">
        <span>{isLeftPage ? title || 'BookFlow' : ''}</span>
        <span>{!isLeftPage ? `Page ${pageNumber}` : ''}</span>
      </div>

      {/* Page Body Content */}
      <div className="flex-1 my-4 flex items-center justify-center overflow-hidden">
        {content ? (
          <div
            className="prose prose-base font-serif leading-relaxed text-justify overflow-y-auto max-h-full px-4"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center opacity-40 font-serif space-y-3">
            <BookOpen className="w-10 h-10" />
            <span className="text-sm italic">Page {pageNumber}</span>
          </div>
        )}
      </div>

      {/* Footer Page Number */}
      <div className="flex items-center justify-between text-xs font-serif opacity-70 pt-3 border-t border-current/10">
        {isLeftPage ? (
          <span>{pageNumber}</span>
        ) : (
          <span className="ml-auto">
            {pageNumber} of {total}
          </span>
        )}
      </div>
    </div>
  );
});
SoftPage.displayName = 'SoftPage';

/* -------------------------------------------------------------------------- */
/* Main Interactive FlipBook Component                                        */
/* -------------------------------------------------------------------------- */
interface PageFlipApi {
  flipPrev: () => void;
  flipNext: () => void;
  turnToPage: (page: number) => void;
  getCurrentPageIndex?: () => number;
}

interface FlipBookRefInstance {
  pageFlip: () => PageFlipApi;
}

export const FlipBookView: React.FC<FlipBookViewProps> = ({
  title,
  author: _author,
  totalPages,
  pdfDoc,
  pages = [],
  currentPage = 1,
  onPageChange,
  theme = 'sepia',
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<FlipBookRefInstance | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const cleanTitle = formatBookTitle(title);

  // Dynamic responsive book dimensions to fill the whole screen
  const [bookDimensions, setBookDimensions] = useState({ width: 580, height: 820 });

  useEffect(() => {
    if (!stageRef.current) return;

    const computeSize = () => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();

      // Available reading stage boundaries
      const availW = Math.max(720, rect.width - 90); // room for side arrows
      const availH = Math.max(500, rect.height - 40); // room for bottom hint

      // Standard book page aspect ratio (width / height ~ 0.707)
      const aspect = 0.707;
      let pageH = availH;
      let pageW = Math.round(pageH * aspect);

      // Two-page spread width
      if (pageW * 2 > availW) {
        pageW = Math.round(availW / 2);
        pageH = Math.round(pageW / aspect);
      }

      setBookDimensions({
        width: Math.min(850, Math.max(360, pageW)),
        height: Math.min(1200, Math.max(500, pageH)),
      });
    };

    computeSize();
    const observer = new ResizeObserver(computeSize);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  // Play subtle paper rustle sound synthesis on page turn
  const playPageTurnSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const bufferSize = audioCtx.sampleRate * 0.08;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
    } catch {
      // AudioContext policy safety
    }
  }, [soundEnabled]);

  const handleFlip = useCallback(
    (e: { data: number }) => {
      playPageTurnSound();
      if (onPageChange) {
        onPageChange(e.data + 1);
      }
    },
    [onPageChange, playPageTurnSound],
  );

  const flipPrev = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  const flipNext = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Synchronize when currentPage changes from reader controls
  useEffect(() => {
    if (!flipBookRef.current) return;
    const targetIndex = Math.max(0, currentPage - 1);
    try {
      const pageFlip = flipBookRef.current.pageFlip();
      if (pageFlip && typeof pageFlip.getCurrentPageIndex === 'function') {
        const currentSpreadPage = pageFlip.getCurrentPageIndex();
        if (currentSpreadPage !== undefined && Math.abs(currentSpreadPage - targetIndex) > 1) {
          pageFlip.turnToPage(targetIndex);
        }
      }
    } catch {
      // safe fallback
    }
  }, [currentPage]);

  const stageBg = {
    light: 'bg-neutral-200/80',
    sepia: 'bg-[#ebd9bd]',
    dark: 'bg-[#0f0e0d]',
  }[theme];

  const totalPageCount = Math.max(totalPages, pages.length || 1);
  const isOdd = totalPageCount % 2 !== 0;

  // Construct strictly valid React elements (react-pageflip crashes if null/false/undefined is passed to cloneElement)
  const bookElements: React.ReactElement[] = [];

  if (pdfDoc) {
    for (let i = 0; i < totalPageCount; i++) {
      const pageNum = i + 1;
      const isLeft = pageNum % 2 !== 0;
      bookElements.push(
        <FlipPdfPage
          key={`pdf-page-${pageNum}`}
          pageNumber={pageNum}
          pdfDoc={pdfDoc}
          theme={theme}
          totalPages={totalPageCount}
          isLeftPage={isLeft}
          targetWidth={bookDimensions.width}
          targetHeight={bookDimensions.height}
        />,
      );
    }
  } else if (pages.length > 0) {
    for (const p of pages) {
      bookElements.push(
        <SoftPage
          key={`soft-page-${p.pageNumber}`}
          pageNumber={p.pageNumber}
          total={totalPageCount}
          theme={theme}
          content={p.content}
          title={cleanTitle}
        />,
      );
    }
  } else {
    for (let i = 0; i < totalPageCount; i++) {
      const pageNum = i + 1;
      bookElements.push(
        <SoftPage
          key={`empty-page-${pageNum}`}
          pageNumber={pageNum}
          total={totalPageCount}
          theme={theme}
          title={cleanTitle}
        />,
      );
    }
  }

  if (isOdd) {
    bookElements.push(<BlankEndPage key="blank-end-page" theme={theme} isLeft={false} />);
  }

  return (
    <div
      ref={stageRef}
      className={`relative w-full h-full flex flex-col items-center justify-center p-1 sm:p-3 overflow-hidden select-none transition-colors duration-300 ${stageBg}`}
    >
      {/* Top Floating Mini-Bar (Sound, Fullscreen) */}
      <div className="absolute top-3 right-4 z-30 flex items-center gap-2 bg-surface/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-border shadow-md">
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 text-text-muted hover:text-text transition-colors"
          title={soundEnabled ? 'Mute page flip sound' : 'Enable page flip sound'}
          aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1 text-text-muted hover:text-text transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* 3D Realistic Open Book Casing (Hardcover outer rim & paper block depth) */}
      <div
        className="relative flex items-center justify-center transition-all duration-300"
        style={{
          filter:
            'drop-shadow(0 25px 35px rgba(0, 0, 0, 0.40)) drop-shadow(0 10px 15px rgba(0, 0, 0, 0.25))',
        }}
      >
        {/* Navigation Arrow Left */}
        <button
          type="button"
          onClick={flipPrev}
          className="hidden md:flex absolute -left-14 z-30 p-3 rounded-full bg-surface/90 hover:bg-surface border border-border shadow-xl text-text transition-all hover:scale-110 active:scale-95"
          title="Previous Page (or click/drag left page)"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Hardcover Outer Leather / Cloth Trim visible around the edges */}
        <div
          className="absolute -inset-2 sm:-inset-3 bg-gradient-to-r from-[#1c1209] via-[#2d1b0e] to-[#1c1209] rounded-md pointer-events-none z-0 border border-amber-950/60"
          style={{
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.8)',
          }}
        />

        {/* Center Book Spine Seam Indicator */}
        <div
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-3 pointer-events-none z-30 opacity-40"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.3) 100%)',
          }}
        />

        {/* The react-pageflip Canvas Container */}
        <div className="relative z-10">
          <HTMLFlipBook
            key={`${bookDimensions.width}-${bookDimensions.height}`}
            ref={flipBookRef}
            width={bookDimensions.width}
            height={bookDimensions.height}
            size="fixed"
            minWidth={320}
            maxWidth={1400}
            minHeight={450}
            maxHeight={1600}
            maxShadowOpacity={0.6}
            showCover={false}
            usePortrait={false}
            mobileScrollSupport={false}
            className="flip-book-container overflow-hidden rounded-xs"
            style={{ margin: 'auto' }}
            onFlip={handleFlip}
            startPage={Math.max(0, currentPage - 1)}
            drawShadow={true}
            flippingTime={600}
            startZIndex={0}
            autoSize={true}
            clickEventForward={true}
            useMouseEvents={true}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={false}
          >
            {bookElements}
          </HTMLFlipBook>
        </div>

        {/* Navigation Arrow Right */}
        <button
          type="button"
          onClick={flipNext}
          className="hidden md:flex absolute -right-14 z-30 p-3 rounded-full bg-surface/90 hover:bg-surface border border-border shadow-xl text-text transition-all hover:scale-110 active:scale-95"
          title="Next Page (or click/drag right page)"
          aria-label="Next Page"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Gesture Hint at Bottom */}
      <p className="mt-3 text-[11px] font-serif tracking-wider text-text-muted opacity-75 text-center">
        ✦ Drag or click the page corner to turn like a physical book ✦
      </p>
    </div>
  );
};
