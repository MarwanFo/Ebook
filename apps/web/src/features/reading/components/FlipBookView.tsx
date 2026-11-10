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
/* Real PDF Page Component (Renders PDF.js canvas with 3D book depth)         */
/* -------------------------------------------------------------------------- */
interface FlipPdfPageProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  theme: 'light' | 'sepia' | 'dark';
  totalPages: number;
  isLeftPage: boolean;
}

const FlipPdfPage = React.forwardRef<HTMLDivElement, FlipPdfPageProps>((props, ref) => {
  const { pageNumber, pdfDoc, theme, totalPages, isLeftPage } = props;
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

        // Target display area in FlipBook (matches HTMLFlipBook page dimensions minus padding)
        const targetWidth = 440;
        const targetHeight = 620;

        const scaleX = targetWidth / unscaledViewport.width;
        const scaleY = targetHeight / unscaledViewport.height;
        const fitScale = Math.min(scaleX, scaleY);

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: fitScale * dpr });

        const canvas = canvasRef.current;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

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
  }, [pdfDoc, pageNumber]);

  const pageBgClass = {
    light: 'bg-white',
    sepia: 'bg-[#faf6ee]',
    dark: 'bg-[#1e1c1a]',
  }[theme];

  return (
    <div
      ref={ref}
      className={`w-full h-full ${pageBgClass} relative flex flex-col justify-between overflow-hidden shadow-sm select-none`}
      style={{
        boxShadow: isLeftPage
          ? 'inset -12px 0 20px -8px rgba(0,0,0,0.14), inset -2px 0 4px rgba(0,0,0,0.06)'
          : 'inset 12px 0 20px -8px rgba(0,0,0,0.14), inset 2px 0 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Spine Crease Shadow Gradient */}
      <div
        className={`absolute top-0 bottom-0 pointer-events-none z-10 ${
          isLeftPage ? 'right-0 w-8' : 'left-0 w-8'
        }`}
        style={{
          background: isLeftPage
            ? 'linear-gradient(to left, rgba(0,0,0,0.12), transparent)'
            : 'linear-gradient(to right, rgba(0,0,0,0.12), transparent)',
        }}
      />

      {/* Fore-edge Paper Stack Depth Lines */}
      <div
        className={`absolute top-0 bottom-0 pointer-events-none z-10 opacity-40 ${
          isLeftPage
            ? 'left-0 w-1 border-r border-black/10'
            : 'right-0 w-1 border-l border-black/10'
        }`}
      />

      {/* Actual PDF Page Canvas */}
      <div className="flex-1 w-full h-full flex items-center justify-center p-2 sm:p-3 overflow-hidden relative">
        {loading && !isRendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-60">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <span className="text-[11px] font-serif">Loading page {pageNumber}...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`block max-h-full max-w-full object-contain transition-opacity duration-200 ${
            isRendered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Discreet Page Footer */}
      <div className="px-4 py-1.5 flex items-center justify-between text-[10px] font-serif opacity-60 border-t border-black/5">
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
          ? 'inset -12px 0 20px -8px rgba(0,0,0,0.14)'
          : 'inset 12px 0 20px -8px rgba(0,0,0,0.14)',
      }}
    >
      <div className="opacity-20 flex flex-col items-center gap-2">
        <BookOpen className="w-8 h-8" />
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
      className={`w-full h-full ${themeClasses} relative p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-sm`}
      style={{
        boxShadow: isLeftPage
          ? 'inset -5px 0 12px rgba(0,0,0,0.06)'
          : 'inset 5px 0 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Running Book Header */}
      <div className="flex items-center justify-between text-[10px] uppercase font-serif tracking-widest opacity-60 pb-2 border-b border-current/10">
        <span>{isLeftPage ? title || 'BookFlow' : ''}</span>
        <span>{!isLeftPage ? `Page ${pageNumber}` : ''}</span>
      </div>

      {/* Page Body Content */}
      <div className="flex-1 my-4 flex items-center justify-center overflow-hidden">
        {content ? (
          <div
            className="prose prose-sm font-serif leading-relaxed text-justify overflow-y-auto max-h-full px-2"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center opacity-40 font-serif space-y-2">
            <BookOpen className="w-8 h-8" />
            <span className="text-xs italic">Page {pageNumber}</span>
          </div>
        )}
      </div>

      {/* Footer Page Number */}
      <div className="flex items-center justify-between text-[11px] font-serif opacity-70 pt-2 border-t border-current/10">
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
  const flipBookRef = useRef<FlipBookRefInstance | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const cleanTitle = formatBookTitle(title);

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
    light: 'bg-neutral-200/70',
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
      className={`relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 transition-colors duration-300 ${stageBg}`}
    >
      {/* Top Floating Mini-Bar (Sound, Fullscreen) */}
      <div className="absolute top-3 right-4 z-30 flex items-center gap-2 bg-surface/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-md">
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

      {/* 3D FlipBook Stage with Book Spine Elevation */}
      <div
        className="relative max-w-full flex items-center justify-center p-2"
        style={{
          perspective: '2500px',
        }}
      >
        {/* Navigation Arrow Left */}
        <button
          type="button"
          onClick={flipPrev}
          className="hidden md:flex absolute -left-12 z-30 p-3 rounded-full bg-surface/80 hover:bg-surface border border-border shadow-lg text-text transition-all hover:scale-110 active:scale-95"
          title="Previous Page (or click/drag left page)"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* The react-pageflip Canvas Container */}
        <HTMLFlipBook
          ref={flipBookRef}
          width={460}
          height={650}
          size="stretch"
          minWidth={320}
          maxWidth={620}
          minHeight={450}
          maxHeight={880}
          maxShadowOpacity={0.5}
          showCover={false}
          mobileScrollSupport={true}
          className="flip-book-container shadow-2xl rounded-sm overflow-hidden"
          style={{ margin: 'auto' }}
          onFlip={handleFlip}
          startPage={Math.max(0, currentPage - 1)}
          drawShadow={true}
          flippingTime={650}
          usePortrait={true}
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

        {/* Navigation Arrow Right */}
        <button
          type="button"
          onClick={flipNext}
          className="hidden md:flex absolute -right-12 z-30 p-3 rounded-full bg-surface/80 hover:bg-surface border border-border shadow-lg text-text transition-all hover:scale-110 active:scale-95"
          title="Next Page (or click/drag right page)"
          aria-label="Next Page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Gesture Hint at Bottom */}
      <p className="mt-4 text-[11px] font-serif tracking-wider text-text-muted opacity-60 text-center">
        ✦ Drag or click the page corner to turn like a physical book ✦
      </p>
    </div>
  );
};
