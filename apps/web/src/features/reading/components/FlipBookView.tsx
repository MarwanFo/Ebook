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
  Bookmark,
  Palette,
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
/* Inside Front Cover (Marbled Endpaper with Ornate "Ex Libris" Bookplate)     */
/* -------------------------------------------------------------------------- */
interface InsideCoverProps {
  title: string;
  author?: string | null;
  theme: 'light' | 'sepia' | 'dark';
}

const InsideCoverPage = React.forwardRef<HTMLDivElement, InsideCoverProps>((props, ref) => {
  const { title, author, theme } = props;
  const cleanTitle = formatBookTitle(title);

  const marbledBg = {
    light: 'radial-gradient(ellipse at 30% 40%, #e2d3be 0%, #b89c80 45%, #7a5d46 100%)',
    sepia: 'radial-gradient(ellipse at 30% 40%, #3e2723 0%, #2b1810 50%, #150904 100%)',
    dark: 'radial-gradient(ellipse at 30% 40%, #24201c 0%, #161412 50%, #0c0b0a 100%)',
  }[theme];

  return (
    <div
      ref={ref}
      className="group w-full h-full relative flex flex-col items-center justify-center p-6 sm:p-10 overflow-hidden select-none"
      style={{
        background: marbledBg,
        boxShadow: 'inset -24px 0 32px -10px rgba(0,0,0,0.38), inset -2px 0 6px rgba(0,0,0,0.22)',
      }}
    >
      {/* 1. Turkish Ebru / Marbled Comb Pattern Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(245,215,160,0.4) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, rgba(180,120,80,0.4) 1px, transparent 1px)`,
          backgroundSize: '16px 16px, 20px 20px',
        }}
      />

      {/* 2. Cylindrical Curvature Shadow into Binding Gutter */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.3) 95%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* 3. Engraved Antique Parchment "Ex Libris" Bookplate */}
      <div
        className="relative z-10 w-full max-w-[340px] sm:max-w-[400px] p-6 sm:p-8 rounded-xs shadow-2xl flex flex-col items-center text-center transition-transform duration-300 group-hover:scale-[1.01]"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #fefcf6 0%, #f6edd9 80%, #ebd7b5 100%)',
          border: '1px solid rgba(139, 94, 60, 0.45)',
          boxShadow: '0 14px 28px rgba(0,0,0,0.4), inset 0 0 18px rgba(160, 110, 60, 0.25)',
        }}
      >
        {/* Double-line Antique Gilded Border */}
        <div className="absolute inset-2 border border-amber-900/30 rounded-xs pointer-events-none" />
        <div className="absolute inset-3 border-2 border-amber-900/20 rounded-xs pointer-events-none" />

        {/* Vintage Corner Flourishes */}
        <span className="absolute top-3.5 left-4 text-amber-900/40 text-xs font-serif select-none">
          ❧
        </span>
        <span className="absolute top-3.5 right-4 text-amber-900/40 text-xs font-serif select-none scale-x-[-1]">
          ❧
        </span>
        <span className="absolute bottom-3.5 left-4 text-amber-900/40 text-xs font-serif select-none scale-y-[-1]">
          ❧
        </span>
        <span className="absolute bottom-3.5 right-4 text-amber-900/40 text-xs font-serif select-none scale-[-1]">
          ❧
        </span>

        {/* Header Ribbon & Crest */}
        <div className="mb-2 flex items-center justify-center gap-2 text-amber-900/80">
          <span className="h-px w-8 bg-amber-900/40" />
          <span className="text-[10px] font-serif uppercase tracking-[0.3em] font-semibold">
            Ex Libris
          </span>
          <span className="h-px w-8 bg-amber-900/40" />
        </div>

        {/* Classical Library Crest Emblem */}
        <div className="my-2 p-2.5 rounded-full border border-amber-900/30 bg-amber-900/5 text-amber-950 shadow-inner">
          <BookOpen className="w-8 h-8" strokeWidth={1.5} />
        </div>

        <p className="text-[11px] font-serif italic text-amber-950/70 tracking-wide mb-3">
          From the Private Library Collection
        </p>

        {/* Book Title */}
        <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 tracking-tight leading-snug line-clamp-3 mb-1 px-2">
          {cleanTitle}
        </h2>

        {/* Author Line */}
        {author && (
          <p className="text-xs font-serif text-neutral-700 tracking-wider mb-3">
            by <span className="font-semibold text-neutral-900">{author}</span>
          </p>
        )}

        {/* Classical Latin Inscription */}
        <div className="mt-2 pt-3 border-t border-amber-900/25 w-full flex flex-col items-center">
          <p className="text-[10px] font-serif italic text-amber-900/70 tracking-wider">
            « Verba volant, scripta manent »
          </p>
          <span className="text-[9px] font-mono uppercase tracking-widest text-amber-950/45 mt-1">
            BookFlow Edition ❖ Turn page to read ➔
          </span>
        </div>
      </div>
    </div>
  );
});
InsideCoverPage.displayName = 'InsideCoverPage';

/* -------------------------------------------------------------------------- */
/* Inside Back Cover (Colophon & Endpaper)                                     */
/* -------------------------------------------------------------------------- */
interface InsideBackCoverProps {
  title: string;
  theme: 'light' | 'sepia' | 'dark';
}

const InsideBackCoverPage = React.forwardRef<HTMLDivElement, InsideBackCoverProps>((props, ref) => {
  const { title, theme } = props;
  const cleanTitle = formatBookTitle(title);

  const marbledBg = {
    light: 'radial-gradient(ellipse at 70% 40%, #e2d3be 0%, #b89c80 45%, #7a5d46 100%)',
    sepia: 'radial-gradient(ellipse at 70% 40%, #3e2723 0%, #2b1810 50%, #150904 100%)',
    dark: 'radial-gradient(ellipse at 70% 40%, #24201c 0%, #161412 50%, #0c0b0a 100%)',
  }[theme];

  return (
    <div
      ref={ref}
      className="w-full h-full relative flex flex-col items-center justify-center p-6 sm:p-10 overflow-hidden select-none"
      style={{
        background: marbledBg,
        boxShadow: 'inset 24px 0 32px -10px rgba(0,0,0,0.38), inset 2px 0 6px rgba(0,0,0,0.22)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background:
            'linear-gradient(to left, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.3) 95%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Colophon Card */}
      <div
        className="relative z-10 w-full max-w-[320px] p-6 rounded-xs shadow-xl flex flex-col items-center text-center text-neutral-800"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #fefcf6 0%, #f6edd9 80%, #ebd7b5 100%)',
          border: '1px solid rgba(139, 94, 60, 0.45)',
        }}
      >
        <div className="absolute inset-1.5 border border-amber-900/20 rounded-xs pointer-events-none" />
        <span className="text-[10px] font-serif uppercase tracking-[0.3em] text-amber-900/80 mb-2 font-semibold">
          Finis
        </span>
        <p className="text-xs font-serif font-semibold text-neutral-900 mb-1">{cleanTitle}</p>
        <p className="text-[11px] font-serif italic text-neutral-600 mb-3">
          End of volume. Rendered with BookFlow 3D Engine.
        </p>
        <div className="w-12 h-px bg-amber-900/30 mb-2" />
        <span className="text-[9px] font-serif text-amber-900/60 uppercase tracking-widest">
          ❖ All Rights Reserved ❖
        </span>
      </div>
    </div>
  );
});
InsideBackCoverPage.displayName = 'InsideBackCoverPage';

/* -------------------------------------------------------------------------- */
/* Real PDF Page Component (Renders crisp PDF.js canvas with 3D curvature)    */
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
    light: 'bg-[#faf8f5]',
    sepia: 'bg-[#fbf7ee]',
    dark: 'bg-[#1e1c1a]',
  }[theme];

  return (
    <div
      ref={ref}
      className={`group w-full h-full ${pageBgClass} relative flex flex-col justify-between overflow-hidden select-none transition-colors duration-200`}
      style={{
        boxShadow: isLeftPage
          ? 'inset -22px 0 30px -10px rgba(0,0,0,0.24), inset -2px 0 6px rgba(0,0,0,0.10)'
          : 'inset 22px 0 30px -10px rgba(0,0,0,0.24), inset 2px 0 6px rgba(0,0,0,0.10)',
      }}
    >
      {/* 1. Realistic Page Cylindrical Curvature Lighting Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: isLeftPage
            ? 'linear-gradient(to right, rgba(0,0,0,0.06) 0%, rgba(255,255,255,0.09) 25%, transparent 60%, rgba(0,0,0,0.22) 95%, rgba(0,0,0,0.45) 100%)'
            : 'linear-gradient(to left, rgba(0,0,0,0.06) 0%, rgba(255,255,255,0.09) 25%, transparent 60%, rgba(0,0,0,0.22) 95%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* 2. Micro Tactile Paper Texture Stippling */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-10 mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.09) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
        }}
      />

      {/* 3. Outer Fore-edge Paper Trim Shadow & Bevel */}
      <div
        className={`absolute top-0 bottom-0 pointer-events-none z-20 ${
          isLeftPage
            ? 'left-0 w-2.5 bg-gradient-to-r from-black/12 to-transparent border-r border-black/5'
            : 'right-0 w-2.5 bg-gradient-to-l from-black/12 to-transparent border-l border-black/5'
        }`}
      />

      {/* 4. Interactive Bottom Corner Lift Affordance */}
      <div
        className={`opacity-30 group-hover:opacity-90 transition-all duration-300 absolute bottom-0 pointer-events-none z-20 ${
          isLeftPage ? 'left-0' : 'right-0'
        }`}
      >
        <div
          className={`w-12 h-12 transition-transform duration-300 group-hover:scale-110 ${
            isLeftPage
              ? 'bg-gradient-to-tr from-black/30 via-black/10 to-transparent'
              : 'bg-gradient-to-tl from-black/30 via-black/10 to-transparent'
          }`}
          style={{
            clipPath: isLeftPage
              ? 'polygon(0 calc(100% - 28px), 28px 100%, 0 100%)'
              : 'polygon(100% calc(100% - 28px), calc(100% - 28px) 100%, 100% 100%)',
          }}
        />
      </div>

      {/* Actual PDF Page Canvas (Scaled large to fill page edge-to-edge) */}
      <div className="flex-1 w-full h-full flex items-center justify-center p-0 sm:p-0.5 overflow-hidden relative z-0">
        {loading && !isRendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-60">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <span className="text-xs font-serif italic text-text-muted">
              Rendering page {pageNumber}...
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`block w-full h-full object-contain transition-opacity duration-300 ${
            isRendered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Discreet Physical Page Number Overlay */}
      <div
        className={`absolute bottom-2 pointer-events-none z-20 px-4 text-[10px] font-serif tracking-widest opacity-45 select-none ${
          isLeftPage ? 'left-2 text-left' : 'right-2 text-right'
        }`}
      >
        <span className="font-mono text-neutral-700 dark:text-neutral-300">
          {isLeftPage ? pageNumber : `${pageNumber} / ${totalPages}`}
        </span>
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
    sepia: 'bg-[#fbf7ee]',
    dark: 'bg-[#1e1c1a]',
  }[theme];

  return (
    <div
      ref={ref}
      className={`w-full h-full ${pageBgClass} relative flex items-center justify-center overflow-hidden select-none`}
      style={{
        boxShadow: isLeft
          ? 'inset -20px 0 28px -10px rgba(0,0,0,0.22)'
          : 'inset 20px 0 28px -10px rgba(0,0,0,0.22)',
      }}
    >
      <div className="opacity-20 flex flex-col items-center gap-2 font-serif text-text-muted">
        <BookOpen className="w-12 h-12" />
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
  isLeftPage?: boolean;
}

const SoftPage = React.forwardRef<HTMLDivElement, SoftPageProps>((props, ref) => {
  const { pageNumber, total, theme, content, title, isLeftPage = pageNumber % 2 === 0 } = props;

  const themeClasses = {
    light: 'bg-[#faf8f5] text-neutral-800',
    sepia: 'bg-[#fbf7ee] text-[#423321]',
    dark: 'bg-[#1e1c1a] text-[#e7e5e4]',
  }[theme];

  return (
    <div
      ref={ref}
      className={`w-full h-full ${themeClasses} relative p-6 sm:p-10 flex flex-col justify-between overflow-hidden shadow-sm`}
      style={{
        boxShadow: isLeftPage
          ? 'inset -16px 0 24px -10px rgba(0,0,0,0.18)'
          : 'inset 16px 0 24px -10px rgba(0,0,0,0.18)',
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
  author,
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
  const [showRibbon, setShowRibbon] = useState(true);
  const [deskMode, setDeskMode] = useState<'mahogany' | 'midnight' | 'oak' | 'minimal'>('mahogany');
  const cleanTitle = formatBookTitle(title);

  // Dynamic PDF page aspect ratio detection (defaults to standard 0.707)
  const [aspectRatio, setAspectRatio] = useState(0.707);

  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;
    pdfDoc
      .getPage(1)
      .then((firstPage) => {
        if (isCancelled) return;
        const vp = firstPage.getViewport({ scale: 1.0 });
        if (vp.width && vp.height) {
          const detected = vp.width / vp.height;
          // Clamp between 0.55 (narrow pocket) and 0.82 (wide US Letter)
          const safe = Math.min(0.82, Math.max(0.55, detected));
          setAspectRatio(safe);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc]);

  // Dynamic responsive book dimensions to fill 92-96% of the screen
  const [bookDimensions, setBookDimensions] = useState({ width: 620, height: 860 });

  useEffect(() => {
    if (!stageRef.current) return;

    const computeSize = () => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();

      // Maximize available reading stage: leave just enough room for side arrows and margins
      const availW = Math.max(680, rect.width - 64);
      const availH = Math.max(480, rect.height - 30);

      let pageH = availH;
      let pageW = Math.round(pageH * aspectRatio);

      // Two-page spread width
      if (pageW * 2 > availW) {
        pageW = Math.round(availW / 2);
        pageH = Math.round(pageW / aspectRatio);
      }

      setBookDimensions({
        width: Math.min(940, Math.max(340, pageW)),
        height: Math.min(1320, Math.max(480, pageH)),
      });
    };

    computeSize();
    const observer = new ResizeObserver(computeSize);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [aspectRatio]);

  // Multi-frequency paper whoosh & settling sound synthesis
  const playPageTurnSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtxClass();

      // Pitch variation factor (+/- 8%) so no two page flips sound identical
      const pitchFactor = 0.92 + Math.random() * 0.16;

      // 1. Friction noise buffer (bandpass paper whoosh)
      const duration = 0.17;
      const bufferSize = Math.floor(audioCtx.sampleRate * duration);
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = Math.sin(t * Math.PI) * (1 - 0.25 * Math.sin(t * 22));
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 * pitchFactor, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(
        700 * pitchFactor,
        audioCtx.currentTime + duration,
      );
      filter.Q.value = 1.35;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();

      // 2. Paper settling click / low-frequency resonance
      const snapOsc = audioCtx.createOscillator();
      const snapGain = audioCtx.createGain();
      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(160 * pitchFactor, audioCtx.currentTime + 0.08);
      snapOsc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
      snapGain.gain.setValueAtTime(0.02, audioCtx.currentTime + 0.08);
      snapGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      snapOsc.connect(snapGain);
      snapGain.connect(audioCtx.destination);
      snapOsc.start(audioCtx.currentTime + 0.08);
      snapOsc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext policy safety
    }
  }, [soundEnabled]);

  const handleFlip = useCallback(
    (e: { data: number }) => {
      playPageTurnSound();
      if (onPageChange) {
        // e.data is the 0-based index of the turned page.
        // Element 0 is Inside Cover, Element 1 is PDF Page 1.
        // When viewing spread 0 (indices 0 and 1), the active reading page is 1.
        const activePdfPage = Math.max(1, Math.min(totalPages, e.data <= 1 ? 1 : e.data));
        onPageChange(activePdfPage);
      }
    },
    [onPageChange, playPageTurnSound, totalPages],
  );

  const flipPrev = useCallback(() => {
    if (flipBookRef.current) {
      try {
        flipBookRef.current.pageFlip().flipPrev();
      } catch {
        // safe fallback
      }
    }
  }, []);

  const flipNext = useCallback(() => {
    if (flipBookRef.current) {
      try {
        flipBookRef.current.pageFlip().flipNext();
      } catch {
        // safe fallback
      }
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Active Keyboard Navigation (Left/Right Arrow keys, PageUp/PageDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        flipPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipNext, flipPrev]);

  // Synchronize when currentPage changes from reader controls (TOC, jump input)
  useEffect(() => {
    if (!flipBookRef.current) return;
    const targetIndex = Math.max(1, currentPage);
    try {
      const pageFlip = flipBookRef.current.pageFlip();
      if (pageFlip && typeof pageFlip.getCurrentPageIndex === 'function') {
        const currentSpreadPage = pageFlip.getCurrentPageIndex();
        if (currentSpreadPage !== undefined) {
          const currentSpread = Math.floor(currentSpreadPage / 2);
          const targetSpread = targetIndex <= 1 ? 0 : Math.floor(targetIndex / 2);
          if (currentSpread !== targetSpread) {
            pageFlip.turnToPage(targetIndex);
          }
        }
      }
    } catch {
      // safe fallback
    }
  }, [currentPage]);

  // Luxury reading desk ambiance backgrounds
  const deskThemes = {
    mahogany: {
      name: 'Mahogany Library',
      bg: 'bg-[#1b110a]',
      vignette:
        'radial-gradient(ellipse at 50% 35%, rgba(255,220,165,0.22) 0%, rgba(43,24,13,0.65) 65%, rgba(12,6,2,0.98) 100%)',
    },
    midnight: {
      name: 'Midnight Study',
      bg: 'bg-[#090a0f]',
      vignette:
        'radial-gradient(ellipse at 50% 32%, rgba(140,170,225,0.18) 0%, rgba(14,16,24,0.7) 65%, rgba(4,5,8,0.99) 100%)',
    },
    oak: {
      name: 'Warm Oak Desk',
      bg: 'bg-[#2e1f13]',
      vignette:
        'radial-gradient(ellipse at 50% 32%, rgba(255,235,185,0.28) 0%, rgba(68,45,25,0.65) 65%, rgba(22,12,6,0.98) 100%)',
    },
    minimal: {
      name: 'Parchment Studio',
      bg: 'bg-[#e4dcce]',
      vignette:
        'radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.55) 0%, rgba(210,195,175,0.45) 65%, rgba(150,130,110,0.5) 100%)',
    },
  };

  const cycleDeskMode = () => {
    const modes: Array<'mahogany' | 'midnight' | 'oak' | 'minimal'> = [
      'mahogany',
      'midnight',
      'oak',
      'minimal',
    ];
    const nextIdx = (modes.indexOf(deskMode) + 1) % modes.length;
    setDeskMode(modes[nextIdx] ?? 'mahogany');
  };

  // Dynamic page block thickness (3px to 18px based on current reading position)
  const readingProgress = totalPages > 1 ? (currentPage - 1) / (totalPages - 1) : 0;
  const leftStackWidth = Math.max(3, Math.min(18, Math.round(3 + readingProgress * 15)));
  const rightStackWidth = Math.max(3, Math.min(18, Math.round(18 - readingProgress * 15)));

  // Construct strictly valid React elements (react-pageflip crashes if null/false/undefined is passed to cloneElement)
  const bookElements: React.ReactElement[] = [];

  // Element 0: Inside Front Cover (Marbled Endpaper with Ex Libris bookplate)
  bookElements.push(
    <InsideCoverPage key="inside-front-cover" title={cleanTitle} author={author} theme={theme} />,
  );

  // Elements 1..N: Real PDF Pages
  // Physical Book Rule: Page 1 is on the RIGHT (Recto), Page 2 on the LEFT (Verso)...
  // So isLeftPage is TRUE when pageNum is EVEN (2, 4, 6...), and FALSE when pageNum is ODD (1, 3, 5...)
  if (pdfDoc) {
    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      const isLeft = pageNum % 2 === 0;
      bookElements.push(
        <FlipPdfPage
          key={`pdf-page-${pageNum}`}
          pageNumber={pageNum}
          pdfDoc={pdfDoc}
          theme={theme}
          totalPages={totalPages}
          isLeftPage={isLeft}
          targetWidth={bookDimensions.width}
          targetHeight={bookDimensions.height}
        />,
      );
    }
  } else if (pages.length > 0) {
    for (const p of pages) {
      const isLeft = p.pageNumber % 2 === 0;
      bookElements.push(
        <SoftPage
          key={`soft-page-${p.pageNumber}`}
          pageNumber={p.pageNumber}
          total={totalPages}
          theme={theme}
          content={p.content}
          title={cleanTitle}
          isLeftPage={isLeft}
        />,
      );
    }
  } else {
    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      const isLeft = pageNum % 2 === 0;
      bookElements.push(
        <SoftPage
          key={`empty-page-${pageNum}`}
          pageNumber={pageNum}
          total={totalPages}
          theme={theme}
          title={cleanTitle}
          isLeftPage={isLeft}
        />,
      );
    }
  }

  // Inside Back Cover to balance two-page spreads
  if (bookElements.length % 2 !== 0) {
    bookElements.push(
      <InsideBackCoverPage key="inside-back-cover" title={cleanTitle} theme={theme} />,
    );
  } else {
    bookElements.push(<BlankEndPage key="blank-end-leaf" theme={theme} isLeft={true} />);
    bookElements.push(
      <InsideBackCoverPage key="inside-back-cover" title={cleanTitle} theme={theme} />,
    );
  }

  const activeDesk = deskThemes[deskMode];

  return (
    <div
      ref={stageRef}
      className={`relative w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 overflow-hidden select-none transition-colors duration-500 ${activeDesk.bg}`}
    >
      {/* Ambient Reading Lamp Vignette Lighting over the Desk */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{
          backgroundImage: activeDesk.vignette,
        }}
      />

      {/* Top Floating Mini-Bar (Ambiance, Ribbon, Sound, Fullscreen) */}
      <div className="absolute top-3 right-4 z-40 flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-amber-100 shadow-2xl">
        <button
          type="button"
          onClick={cycleDeskMode}
          className="p-1.5 rounded-full text-neutral-300 hover:text-amber-200 transition-colors flex items-center gap-1.5"
          title={`Desk: ${activeDesk.name} (Click to change)`}
          aria-label="Change Ambiance"
        >
          <Palette className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[10px] font-serif tracking-wide text-amber-200/90">
            {activeDesk.name}
          </span>
        </button>
        <div className="w-px h-3.5 bg-white/20" />
        <button
          type="button"
          onClick={() => setShowRibbon(!showRibbon)}
          className={`p-1.5 rounded-full transition-colors ${
            showRibbon ? 'text-rose-400' : 'text-neutral-400 hover:text-white'
          }`}
          title={showRibbon ? 'Hide Bookmark Ribbon' : 'Show Bookmark Ribbon'}
          aria-label={showRibbon ? 'Hide Ribbon' : 'Show Ribbon'}
        >
          <Bookmark className="w-3.5 h-3.5 fill-current" />
        </button>
        <div className="w-px h-3.5 bg-white/20" />
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-full text-neutral-300 hover:text-white transition-colors"
          title={soundEnabled ? 'Mute page flip sound' : 'Enable page flip sound'}
          aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-full text-neutral-300 hover:text-white transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* 3D Realistic Open Book Structure (Boards, paper stack depth, and desk shadow) */}
      <div
        className="relative flex items-center justify-center transition-all duration-300 z-10"
        style={{
          filter:
            'drop-shadow(0 32px 48px rgba(0, 0, 0, 0.6)) drop-shadow(0 14px 20px rgba(0, 0, 0, 0.4))',
        }}
      >
        {/* Navigation Arrow Left (Antique brass tab) */}
        <button
          type="button"
          onClick={flipPrev}
          className="hidden md:flex absolute -left-10 lg:-left-12 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-amber-200 border border-amber-400/30 backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95"
          title="Previous Page (or click/drag left page)"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* 1. Outer Hardcover Casing Boards */}
        <div
          className="absolute pointer-events-none z-0 rounded-lg border border-amber-950/70 transition-all duration-300"
          style={{
            top: '-12px',
            bottom: '-12px',
            left: `-${leftStackWidth + 8}px`,
            right: `-${rightStackWidth + 8}px`,
            background:
              'linear-gradient(135deg, #2b180d 0%, #3d2415 35%, #221208 70%, #150a04 100%)',
            boxShadow:
              'inset 0 1px 2px rgba(255,255,255,0.18), inset 0 -3px 6px rgba(0,0,0,0.9), 0 16px 36px rgba(0,0,0,0.7)',
          }}
        >
          {/* Subtle Gilded Blind-Stamp Border on Leather Casing */}
          <div className="absolute inset-1.5 border border-amber-500/25 rounded-md pointer-events-none" />

          {/* 4 Antique Brass Corner Protectors (L-shaped ornate brackets) */}
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-amber-400/50 rounded-tl-sm pointer-events-none bg-gradient-to-br from-amber-300/25 to-transparent" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-amber-400/50 rounded-tr-sm pointer-events-none bg-gradient-to-bl from-amber-300/25 to-transparent" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-amber-400/50 rounded-bl-sm pointer-events-none bg-gradient-to-tr from-amber-300/25 to-transparent" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-amber-400/50 rounded-br-sm pointer-events-none bg-gradient-to-tl from-amber-300/25 to-transparent" />
        </div>

        {/* 2. Left Page-Block Depth (Layered paper edge leaves on left) */}
        <div
          className="absolute top-1.5 bottom-1.5 pointer-events-none z-0 rounded-l-xs transition-all duration-300"
          style={{
            left: `-${leftStackWidth}px`,
            width: `${leftStackWidth}px`,
            background:
              'repeating-linear-gradient(to right, #ece3cf 0px, #e2d6be 1px, #f5ecd8 2px, #ddd0b5 3px)',
            boxShadow: 'inset 2px 0 3px rgba(0,0,0,0.35), -2px 0 4px rgba(0,0,0,0.25)',
          }}
        />

        {/* 3. Right Page-Block Depth (Layered paper edge leaves on right) */}
        <div
          className="absolute top-1.5 bottom-1.5 pointer-events-none z-0 rounded-r-xs transition-all duration-300"
          style={{
            right: `-${rightStackWidth}px`,
            width: `${rightStackWidth}px`,
            background:
              'repeating-linear-gradient(to left, #ece3cf 0px, #e2d6be 1px, #f5ecd8 2px, #ddd0b5 3px)',
            boxShadow: 'inset -2px 0 3px rgba(0,0,0,0.35), 2px 0 4px rgba(0,0,0,0.25)',
          }}
        />

        {/* 4. Bottom Page-Block Ledge (Bottom paper trims) */}
        <div
          className="absolute left-1 right-1 -bottom-2 sm:-bottom-2.5 h-2.5 pointer-events-none z-0 rounded-b-xs"
          style={{
            background:
              'repeating-linear-gradient(to bottom, #ded2b9 0px, #ede2cb 1px, #d5c8ad 2px)',
            boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
          }}
        />

        {/* 5. Top Woven Silk Endband / Headband (Red & Gold striped binding cloth) */}
        <div
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-t-xs pointer-events-none z-30"
          style={{
            background:
              'repeating-linear-gradient(90deg, #8b1e28 0px, #8b1e28 3px, #e2a84b 3px, #e2a84b 6px)',
            boxShadow: '0 -1px 3px rgba(0,0,0,0.5)',
          }}
        />

        {/* 6. Bottom Woven Silk Endband / Tailband (Red & Gold striped binding cloth) */}
        <div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-b-xs pointer-events-none z-30"
          style={{
            background:
              'repeating-linear-gradient(90deg, #8b1e28 0px, #8b1e28 3px, #e2a84b 3px, #e2a84b 6px)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        />

        {/* 7. Center Book Spine Seam & Stitched Binding */}
        <div
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-5 pointer-events-none z-30"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.3) 100%)',
          }}
        >
          {/* Subtle Stitched Bookbinding Thread Knots */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-1 h-1.5 rounded-full bg-amber-100/40 shadow-xs" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-1 h-1.5 rounded-full bg-amber-100/35 shadow-xs" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-1 h-1.5 rounded-full bg-amber-100/40 shadow-xs" />
          <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-1 h-1.5 rounded-full bg-amber-100/35 shadow-xs" />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-1 h-1.5 rounded-full bg-amber-100/40 shadow-xs" />
        </div>

        {/* 8. Satin Bookmark Ribbon draping across the open spread */}
        {showRibbon && (
          <div
            className="absolute top-0 left-[58%] w-4 pointer-events-none z-30 transition-all duration-300"
            style={{
              height: '80%',
              filter: 'drop-shadow(2px 5px 8px rgba(0,0,0,0.55))',
            }}
          >
            <div
              className="w-full h-full relative"
              style={{
                background:
                  'linear-gradient(to right, #6b0f16 0%, #a81c25 35%, #e63946 60%, #85131b 100%)',
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 12px), 0 100%)',
              }}
            >
              {/* Silk thread sheen reflection */}
              <div className="absolute inset-y-0 left-1 w-0.5 bg-white/25 pointer-events-none" />
            </div>
          </div>
        )}

        {/* 9. The react-pageflip Canvas Container */}
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
            maxShadowOpacity={0.65}
            showCover={false}
            usePortrait={false}
            mobileScrollSupport={false}
            className="flip-book-container overflow-hidden rounded-xs"
            style={{ margin: 'auto' }}
            onFlip={handleFlip}
            startPage={Math.max(1, currentPage)}
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

        {/* Navigation Arrow Right (Antique brass tab) */}
        <button
          type="button"
          onClick={flipNext}
          className="hidden md:flex absolute -right-10 lg:-right-12 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-amber-200 border border-amber-400/30 backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95"
          title="Next Page (or click/drag right page)"
          aria-label="Next Page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Gesture Hint at Bottom */}
      <p className="mt-1.5 text-[10px] font-serif tracking-widest text-amber-200/50 uppercase text-center drop-shadow-xs z-10 pointer-events-none">
        ❖ Turn pages with Arrow Keys (← / →) or by clicking/dragging corners ❖
      </p>
    </div>
  );
};
