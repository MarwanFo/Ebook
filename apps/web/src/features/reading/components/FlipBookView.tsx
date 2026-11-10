import React, { useRef, useState, useCallback, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface FlipPageData {
  pageNumber: number;
  content?: string;
  canvasDataUrl?: string;
  title?: string;
}

interface FlipBookViewProps {
  title: string;
  author?: string | null;
  totalPages: number;
  pages: FlipPageData[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
  theme?: 'light' | 'sepia' | 'dark';
}

/* -------------------------------------------------------------------------- */
/* Rigid Hardcover Component (Front & Back)                                   */
/* -------------------------------------------------------------------------- */
interface HardCoverProps {
  title: string;
  author?: string | null;
  isBack?: boolean;
}

const HardCover = React.forwardRef<HTMLDivElement, HardCoverProps>((props, ref) => {
  const { title, author, isBack = false } = props;

  if (isBack) {
    return (
      <div
        ref={ref}
        data-density="hard"
        className="w-full h-full bg-gradient-to-br from-[#1b263b] via-[#0d1b2a] to-[#070e17] text-amber-100/80 p-8 flex flex-col justify-between items-center shadow-2xl border-l-4 border-amber-500/20"
        style={{
          boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.8), inset -2px 0 4px rgba(255,255,255,0.05)',
        }}
      >
        <div className="w-full h-full border border-amber-400/20 rounded-sm p-4 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-8 h-8 text-amber-300/40 mb-3" />
          <p className="text-xs uppercase tracking-widest text-amber-200/50 font-serif">
            BookFlow Reader Edition
          </p>
          <div className="w-12 h-px bg-amber-400/20 my-3" />
          <p className="text-[10px] text-amber-200/40 font-mono">End of Volume</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-density="hard"
      className="w-full h-full bg-gradient-to-br from-[#0d1b2a] via-[#1b263b] to-[#0d1b2a] text-amber-100 p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden border-r-4 border-amber-500/20"
      style={{
        boxShadow: 'inset -6px 0 14px rgba(0,0,0,0.8), inset 2px 0 4px rgba(255,255,255,0.1)',
      }}
    >
      {/* Texture Grain */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
        }}
      />

      {/* Ornate Gilded Border */}
      <div className="absolute inset-4 border-2 border-amber-400/30 rounded-sm p-1.5 flex flex-col justify-between pointer-events-none">
        <div className="w-full h-full border border-amber-400/20 flex flex-col justify-between p-4">
          <div className="flex justify-between items-center opacity-40">
            <span className="text-[10px]">✦</span>
            <span className="text-[10px]">✦</span>
          </div>
          <div className="flex justify-between items-center opacity-40">
            <span className="text-[10px]">✦</span>
            <span className="text-[10px]">✦</span>
          </div>
        </div>
      </div>

      {/* Header Badge */}
      <div className="relative z-10 text-center pt-4">
        <span className="text-[9px] uppercase font-bold tracking-[0.25em] text-amber-200/70 border border-amber-300/20 px-3 py-1 rounded-full bg-black/30">
          Collector&apos;s Edition
        </span>
      </div>

      {/* Title & Author */}
      <div className="relative z-10 text-center my-auto px-4">
        <h1
          className="font-serif text-2xl font-bold tracking-tight text-amber-50 mb-3 leading-snug"
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(246,211,101,0.2)',
          }}
        >
          {title}
        </h1>
        {author && (
          <p className="font-serif text-xs italic tracking-widest text-amber-200/90 mt-2">
            by {author}
          </p>
        )}
      </div>

      {/* Bottom Emblem */}
      <div className="relative z-10 text-center pb-2 opacity-75">
        <span className="text-[11px] font-serif tracking-widest text-amber-300/60">
          ❖ &nbsp; BOOKFLOW &nbsp; ❖
        </span>
      </div>
    </div>
  );
});
HardCover.displayName = 'HardCover';

/* -------------------------------------------------------------------------- */
/* Soft Flexible Page Component                                               */
/* -------------------------------------------------------------------------- */
interface SoftPageProps {
  pageNumber: number;
  total: number;
  theme: 'light' | 'sepia' | 'dark';
  canvasDataUrl?: string;
  content?: string;
  title?: string;
}

const SoftPage = React.forwardRef<HTMLDivElement, SoftPageProps>((props, ref) => {
  const { pageNumber, total, theme, canvasDataUrl, content, title } = props;
  const isLeftPage = pageNumber % 2 === 0;

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
      {/* Subtle Paper Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '6px 6px',
        }}
      />

      {/* Running Book Header */}
      <div className="flex items-center justify-between text-[10px] uppercase font-serif tracking-widest opacity-60 pb-2 border-b border-current/10">
        <span>{isLeftPage ? title || 'BookFlow' : ''}</span>
        <span>{!isLeftPage ? `Chapter ${Math.ceil(pageNumber / 10)}` : ''}</span>
      </div>

      {/* Page Body Content */}
      <div className="flex-1 my-4 flex items-center justify-center overflow-hidden">
        {canvasDataUrl ? (
          <img
            src={canvasDataUrl}
            alt={`Page ${pageNumber}`}
            className="max-h-full max-w-full object-contain pointer-events-none rounded-xs"
          />
        ) : content ? (
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
}

interface FlipBookRefInstance {
  pageFlip: () => PageFlipApi;
}

export const FlipBookView: React.FC<FlipBookViewProps> = ({
  title,
  author,
  totalPages,
  pages,
  currentPage = 1,
  onPageChange,
  theme = 'sepia',
}) => {
  const flipBookRef = useRef<FlipBookRefInstance | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play subtle paper rustle sound synthesis on page turn
  const playPageTurnSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const bufferSize = audioCtx.sampleRate * 0.08; // 80ms white-noise whoosh
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
        onPageChange(e.data);
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

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-6 select-none overflow-hidden">
      {/* Top Floating Utility Controls */}
      <div className="absolute top-3 right-4 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 text-white/80 shadow-md">
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="hover:text-white transition-colors p-1"
          title={soundEnabled ? 'Mute page flip sound' : 'Enable page flip sound'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="hover:text-white transition-colors p-1"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Physical Book Spine Gutter Light Simulation */}
      <div
        className="relative z-10 flex items-center justify-center w-full max-w-5xl"
        style={{
          filter:
            'drop-shadow(0 20px 30px rgba(0,0,0,0.35)) drop-shadow(0 8px 12px rgba(0,0,0,0.2))',
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
          width={440}
          height={620}
          size="stretch"
          minWidth={320}
          maxWidth={540}
          minHeight={450}
          maxHeight={780}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={true}
          className="flip-book-container shadow-2xl rounded-sm overflow-hidden"
          style={{ margin: 'auto' }}
          onFlip={handleFlip}
          startPage={Math.max(0, currentPage - 1)}
          drawShadow={true}
          flippingTime={700}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {/* Front Rigid Hardcover */}
          <HardCover title={title} author={author} />

          {/* Soft Paper Inner Pages */}
          {pages.map((p) => (
            <SoftPage
              key={p.pageNumber}
              pageNumber={p.pageNumber}
              total={totalPages}
              theme={theme}
              canvasDataUrl={p.canvasDataUrl}
              content={p.content}
              title={title}
            />
          ))}

          {/* Back Rigid Hardcover */}
          <HardCover title={title} author={author} isBack={true} />
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
