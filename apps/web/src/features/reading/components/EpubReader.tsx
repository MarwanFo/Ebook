import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePubLibrary, { Book, Rendition, Location, NavItem } from 'epubjs';
import { LocationType } from '@bookflow/shared-types';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Palette,
  Bookmark,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { booksApi } from '../../books/services/books-api';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { useUpdateProgress } from '../hooks/useUpdateProgress';
import { useReaderStore } from '../stores/reader-store';
import { ReaderHeader } from './ReaderHeader';
import { ReaderFooter } from './ReaderFooter';
import { ReaderTocSidebar } from './ReaderTocSidebar';
import { ReaderSettingsModal } from './ReaderSettingsModal';
import { BookmarksSidebar } from './BookmarksSidebar';
import { useBookmarks } from '../hooks/useBookmarks';

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
  const { theme, fontFamily, fontSize, lineHeight, layout, setLayout } = useReaderStore();

  // Desk Ambiance State for Mode Book (Matching FlipBookView)
  const [deskMode, setDeskMode] = useState<'mahogany' | 'midnight' | 'oak' | 'minimal'>('mahogany');
  const [ribbonVisible, setRibbonVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  const playPageTurnSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const pitchFactor = 0.92 + Math.random() * 0.16;
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
    } catch {
      // AudioContext policy safety
    }
  }, [soundEnabled]);

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
  const [currentPage, setCurrentPage] = useState<number | undefined>(undefined);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  // Overlay Panels
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleJumpToLocation = useCallback((_locType: LocationType, locValue: string) => {
    if (renditionRef.current) {
      renditionRef.current.display(locValue);
    }
  }, []);

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
      const isBook = layout === 'book';

      const lightBg = isBook ? '#faf8f5 !important' : '#ffffff !important';
      const sepiaBg = isBook ? '#fbf7ee !important' : '#f5edd6 !important';
      const darkBg = isBook ? '#1e1c1a !important' : '#121110 !important';

      // Theme rules
      themes.register('light', {
        body: {
          background: lightBg,
          color: '#1a1a1a !important',
          'font-family': getFontFamilyCss(fontFamily),
          'font-size': `${fontSize}px !important`,
          'line-height': `${lineHeight} !important`,
          padding: '0 24px !important',
        },
        img: { 'max-width': '100% !important', height: 'auto !important' },
        p: { 'line-height': `${lineHeight} !important`, 'margin-bottom': '1em !important' },
        a: { color: '#b45309 !important', 'text-decoration': 'underline' },
      });

      themes.register('sepia', {
        body: {
          background: sepiaBg,
          color: '#4a3b2c !important',
          'font-family': getFontFamilyCss(fontFamily),
          'font-size': `${fontSize}px !important`,
          'line-height': `${lineHeight} !important`,
          padding: '0 24px !important',
        },
        img: { 'max-width': '100% !important', height: 'auto !important' },
        p: { 'line-height': `${lineHeight} !important`, 'margin-bottom': '1em !important' },
        a: { color: '#92400e !important', 'text-decoration': 'underline' },
      });

      themes.register('dark', {
        body: {
          background: darkBg,
          color: '#e2e8f0 !important',
          'font-family': getFontFamilyCss(fontFamily),
          'font-size': `${fontSize}px !important`,
          'line-height': `${lineHeight} !important`,
          padding: '0 24px !important',
        },
        img: { 'max-width': '100% !important', height: 'auto !important' },
        p: { 'line-height': `${lineHeight} !important`, 'margin-bottom': '1em !important' },
        a: { color: '#fbbf24 !important', 'text-decoration': 'underline' },
      });

      themes.select(theme);
      themes.fontSize(`${fontSize}px`);
    },
    [fontFamily, fontSize, layout, lineHeight, theme],
  );

  // Determine Spread Setting
  const getSpreadSetting = useCallback(() => {
    if (layout === 'single-page') return 'none';
    if (layout === 'two-page' || layout === 'book') return 'always';
    return 'auto';
  }, [layout]);

  // Synchronize style updates and layout changes when preferences change
  useEffect(() => {
    if (renditionRef.current) {
      applyStylesToRendition(renditionRef.current);
      try {
        (renditionRef.current as unknown as { spread?: (val: string) => void }).spread?.(
          getSpreadSetting(),
        );
      } catch {
        // safe fallback
      }
    }
  }, [applyStylesToRendition, getSpreadSetting]);

  // Handle Location Change & Debounced Save
  const handleRelocated = useCallback(
    (location: Location) => {
      if (!location || !location.start) return;

      const cfi = location.start.cfi;
      setCurrentCfi(cfi);

      // Calculate progress percentage and page numbers
      let pct = 0;
      const locLocations = bookRef.current?.locations as unknown as {
        locationFromCfi?: (cfi: string) => number;
        total?: number;
        percentageFromCfi?: (cfi: string) => number;
      };

      if (locLocations && locLocations.total && locLocations.percentageFromCfi) {
        pct = locLocations.percentageFromCfi(cfi) * 100;
        const currentLocIndex = locLocations.locationFromCfi?.(cfi);
        if (typeof currentLocIndex === 'number' && currentLocIndex >= 0) {
          setCurrentPage(currentLocIndex + 1);
          setTotalPages(locLocations.total);
        }
      } else if (typeof location.start.percentage === 'number') {
        pct = location.start.percentage * 100;
        if (location.start.displayed && location.start.displayed.total > 2) {
          setCurrentPage(location.start.displayed.page);
          setTotalPages(location.start.displayed.total);
        } else {
          setCurrentPage(undefined);
          setTotalPages(undefined);
        }
      } else {
        setCurrentPage(undefined);
        setTotalPages(undefined);
      }
      pct = Math.min(100, Math.max(0, pct));
      setProgressPercentage(pct);

      // Identify current chapter label from TOC
      const locStart = location.start as unknown as { href?: string; cfi: string };
      if (toc.length > 0 && locStart?.href) {
        const currentHref = locStart.href;
        const cleanCurrent = currentHref.split('#')[0]?.replace(/^\/+/g, '').toLowerCase() || '';

        const findMatchingToc = (items: NavItem[]): NavItem | null => {
          for (const item of items) {
            const itemHref = item.href;
            if (itemHref) {
              const cleanItem = itemHref.split('#')[0]?.replace(/^\/+/g, '').toLowerCase() || '';
              if (
                cleanCurrent === cleanItem ||
                cleanCurrent.endsWith(cleanItem) ||
                cleanItem.endsWith(cleanCurrent)
              ) {
                return item;
              }
            }
            if (item.subitems && item.subitems.length > 0) {
              const matchedSub = findMatchingToc(item.subitems);
              if (matchedSub) return matchedSub;
            }
          }
          return null;
        };

        const matchingItem = findMatchingToc(toc);
        if (matchingItem && matchingItem.label) {
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
    playPageTurnSound();
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  }, [playPageTurnSound]);

  const handleNext = useCallback(() => {
    playPageTurnSound();
    if (renditionRef.current) {
      // If currently on a standalone cover wrapper, jump directly to the first readable chapter
      const loc = renditionRef.current.location as unknown as
        { start?: { href?: string } } | undefined;
      const currentHref = loc?.start?.href?.toLowerCase() || '';
      if ((currentHref.includes('wrap') || currentHref.includes('cover')) && bookRef.current) {
        const spine =
          (bookRef.current as unknown as { spine?: { spineItems?: Array<{ href?: string }> } })
            ?.spine?.spineItems || [];
        if (spine.length > 1 && spine[1]?.href) {
          renditionRef.current.display(spine[1].href);
          return;
        }
      }
      renditionRef.current.next();
    }
  }, [playPageTurnSound]);

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

        // Capture text selection CFI for instant bookmarking/annotation
        rendition.on('selected', (cfiRange: string) => {
          if (!isCancelled && cfiRange) {
            setCurrentCfi(cfiRange);
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

        // Handle click inside EPUB iframe to turn pages
        rendition.on('click', (e: MouseEvent) => {
          if (isCancelled) return;

          // Don't turn pages if user is selecting text
          const activeSelection = window.getSelection?.()?.toString();
          if (activeSelection && activeSelection.trim().length > 0) return;

          // Don't turn pages if clicked on interactive link/button
          const target = e.target as HTMLElement | null;
          if (target && target.closest?.('a, button, input, select, textarea')) return;

          const targetDoc = (e.target as HTMLElement)?.ownerDocument || document;
          const viewportWidth = targetDoc.documentElement?.clientWidth || window.innerWidth;
          const x = e.clientX || 0;

          if (x > viewportWidth * 0.55) {
            callbacksRef.current.handleNext();
          } else if (x < viewportWidth * 0.45) {
            callbacksRef.current.handlePrev();
          }
        });

        // Determine starting location: saved CFI or beginning
        let startTarget = callbacksRef.current.savedProgress?.locationValue || undefined;

        // If no saved progress, or saved progress is stuck on the cover section at 0%
        const isStuckOnCover =
          startTarget &&
          (startTarget.toLowerCase().includes('wrap') ||
            startTarget.toLowerCase().includes('cover')) &&
          (callbacksRef.current.savedProgress?.progressPercentage ?? 0) <= 1;

        if (!startTarget || isStuckOnCover) {
          try {
            const loadedObj = book.loaded as unknown as { spine?: Promise<unknown> };
            if (loadedObj?.spine) {
              await loadedObj.spine;
            }
            const spine = (
              book as unknown as {
                spine?: {
                  spineItems?: Array<{
                    href?: string;
                    idref?: string;
                    linear?: string | boolean;
                  }>;
                };
              }
            )?.spine;
            const items = spine?.spineItems || [];
            if (items.length > 1 && items[0]) {
              const first = items[0];
              const href = (first.href || '').toLowerCase();
              const idref = (first.idref || '').toLowerCase();
              const isCover =
                href.includes('cover') ||
                href.includes('wrap') ||
                idref.includes('cover') ||
                idref.includes('wrap') ||
                first.linear === false ||
                first.linear === 'no';

              if (isCover && items[1]?.href) {
                startTarget = items[1].href;
              }
            }
          } catch (e) {
            console.warn('Could not inspect spine for cover bypass:', e);
          }
        }

        await rendition.display(startTarget);
        if (isCancelled) return;

        setIsLoadingBook(false);

        // Generate location index in background for precise percentage
        book.ready.then(() => {
          if (!isCancelled) {
            book.locations
              .generate(1000)
              .then(() => {
                if (!isCancelled && renditionRef.current) {
                  const currentLoc = renditionRef.current.currentLocation() as unknown as Location;
                  if (currentLoc && currentLoc.start) {
                    callbacksRef.current.handleRelocated(currentLoc);
                  }
                }
              })
              .catch(() => {});
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
  const activeDesk = deskThemes[deskMode];
  const isBookMode = layout === 'book' || !layout;

  const canvasBgClass = isBookMode
    ? `${activeDesk.bg} text-neutral-100`
    : {
        light: 'bg-white text-neutral-900',
        sepia: 'bg-[#f5edd6] text-[#4a3b2c]',
        dark: 'bg-[#121110] text-[#e4e2dd]',
      }[theme];

  const progressRatio = (progressPercentage || 0) / 100;
  const leftStackWidth = Math.max(3, Math.min(18, Math.round(3 + progressRatio * 15)));
  const rightStackWidth = Math.max(3, Math.min(18, Math.round(18 - progressRatio * 15)));

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden select-none ${canvasBgClass}`}>
      {/* Top Header Bar */}
      <ReaderHeader
        title={bookTitle}
        author={author}
        chapterTitle={currentChapter}
        theme={theme}
        layout={layout}
        onLayoutChange={setLayout}
        isTocOpen={isTocOpen}
        onToggleToc={() => {
          setIsTocOpen(!isTocOpen);
          setIsSettingsOpen(false);
          setIsBookmarksOpen(false);
        }}
        isBookmarksOpen={isBookmarksOpen}
        onToggleBookmarks={() => {
          setIsBookmarksOpen(!isBookmarksOpen);
          setIsTocOpen(false);
          setIsSettingsOpen(false);
        }}
        bookmarkCount={bookmarks.length}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => {
          setIsSettingsOpen(!isSettingsOpen);
          setIsTocOpen(false);
          setIsBookmarksOpen(false);
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Reading Stage */}
      <main className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
        {/* Ambient Reading Lamp Vignette Lighting over the Desk (Book Mode) */}
        {isBookMode && (
          <div
            className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-500"
            style={{
              backgroundImage: activeDesk.vignette,
            }}
          />
        )}

        {/* Floating Mini-Bar in Book Mode */}
        {isBookMode && (
          <div className="absolute top-3 right-4 sm:right-8 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-amber-900/40 text-amber-200 shadow-xl">
            {/* Cycle Desk Texture */}
            <button
              type="button"
              onClick={cycleDeskMode}
              className="px-2.5 py-1 rounded-full text-xs font-serif flex items-center gap-1.5 hover:bg-white/10 transition-colors cursor-pointer"
              title="Change Reading Desk Ambiance"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">{activeDesk.name}</span>
            </button>
            {/* Toggle Silk Bookmark Ribbon */}
            <button
              type="button"
              onClick={() => setRibbonVisible(!ribbonVisible)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                ribbonVisible ? 'text-rose-400 bg-white/10' : 'text-neutral-400 hover:text-white'
              }`}
              title="Toggle Silk Bookmark Ribbon"
              aria-label="Toggle Silk Bookmark Ribbon"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            {/* Toggle Realistic Page Flip Audio */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Page Turn Sound' : 'Enable Page Turn Sound'}
              aria-label="Toggle Page Turn Sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 opacity-60" />
              )}
            </button>
          </div>
        )}

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

        {/* Reading Stage Content: 3D Hardcover Book or Flat Canvas */}
        {isBookMode ? (
          <div
            className="relative flex items-center justify-center transition-all duration-300 z-10 w-full max-w-6xl h-[88vh] max-h-[860px] mx-auto px-4 sm:px-8 py-2"
            style={{
              filter:
                'drop-shadow(0 32px 48px rgba(0, 0, 0, 0.6)) drop-shadow(0 14px 20px rgba(0, 0, 0, 0.4))',
            }}
          >
            {/* 1. Outer Hardcover Casing Boards */}
            <div
              className="absolute pointer-events-none z-0 rounded-lg border border-amber-950/70 transition-all duration-300"
              style={{
                top: '-8px',
                bottom: '-8px',
                left: `-${leftStackWidth + 6}px`,
                right: `-${rightStackWidth + 6}px`,
                background:
                  'linear-gradient(135deg, #2b180d 0%, #3d2415 35%, #221208 70%, #150a04 100%)',
                boxShadow:
                  'inset 0 1px 2px rgba(255,255,255,0.18), inset 0 -3px 6px rgba(0,0,0,0.9), 0 16px 36px rgba(0,0,0,0.7)',
              }}
            >
              {/* Subtle Gilded Blind-Stamp Border on Leather Casing */}
              <div className="absolute inset-1.5 border border-amber-500/25 rounded-md pointer-events-none" />

              {/* 4 Antique Brass Corner Protectors */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-amber-400/50 rounded-tl-sm pointer-events-none bg-gradient-to-br from-amber-300/25 to-transparent" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-amber-400/50 rounded-tr-sm pointer-events-none bg-gradient-to-bl from-amber-300/25 to-transparent" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-amber-400/50 rounded-bl-sm pointer-events-none bg-gradient-to-tr from-amber-300/25 to-transparent" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-amber-400/50 rounded-br-sm pointer-events-none bg-gradient-to-tl from-amber-300/25 to-transparent" />
            </div>

            {/* 2. Left Page-Block Depth (Layered paper edge leaves on left) */}
            <div
              className="absolute top-1.5 bottom-1.5 pointer-events-none z-0 rounded-l-xs transition-all duration-300 hidden md:block"
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
              className="absolute top-1.5 bottom-1.5 pointer-events-none z-0 rounded-r-xs transition-all duration-300 hidden md:block"
              style={{
                right: `-${rightStackWidth}px`,
                width: `${rightStackWidth}px`,
                background:
                  'repeating-linear-gradient(to left, #ece3cf 0px, #e2d6be 1px, #f5ecd8 2px, #ddd0b5 3px)',
                boxShadow: 'inset -2px 0 3px rgba(0,0,0,0.35), 2px 0 4px rgba(0,0,0,0.25)',
              }}
            />

            {/* 4. Bottom Page-Block Ledge */}
            <div
              className="absolute left-1 right-1 -bottom-2 sm:-bottom-2.5 h-2.5 pointer-events-none z-0 rounded-b-xs"
              style={{
                background:
                  'repeating-linear-gradient(to bottom, #ded2b9 0px, #ede2cb 1px, #d5c8ad 2px)',
                boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
              }}
            />

            {/* 5. Top & Bottom Woven Silk Headbands */}
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-t-xs pointer-events-none z-30 hidden md:block"
              style={{
                background:
                  'repeating-linear-gradient(90deg, #8b1e28 0px, #8b1e28 3px, #e2a84b 3px, #e2a84b 6px)',
                boxShadow: '0 -1px 3px rgba(0,0,0,0.5)',
              }}
            />
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-b-xs pointer-events-none z-30 hidden md:block"
              style={{
                background:
                  'repeating-linear-gradient(90deg, #8b1e28 0px, #8b1e28 3px, #e2a84b 3px, #e2a84b 6px)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            />

            {/* 6. Hanging Red Silk Bookmark Ribbon */}
            {ribbonVisible && (
              <div
                className="absolute top-0 bottom-[-18px] sm:bottom-[-26px] left-1/2 -translate-x-1/2 w-2 sm:w-2.5 pointer-events-none z-40 transition-all duration-300"
                style={{
                  background: 'linear-gradient(to right, #7f1d1d, #dc2626 50%, #991b1b)',
                  filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.45))',
                }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 h-3"
                  style={{
                    background: 'inherit',
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 60%, 0 100%)',
                  }}
                />
              </div>
            )}

            {/* 7. Center Book Spine Crease & Groove Shadow */}
            <div
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none z-20 hidden md:block"
              style={{
                background:
                  'linear-gradient(to right, rgba(0,0,0,0.08), rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.08))',
              }}
            />

            {/* 8. Cylindrical Curvature Overlays */}
            <div
              className="absolute top-0 bottom-0 left-0 right-1/2 pointer-events-none z-10 hidden md:block"
              style={{
                background:
                  'linear-gradient(to right, rgba(0,0,0,0.05) 0%, rgba(255,255,255,0.08) 25%, transparent 60%, rgba(0,0,0,0.18) 95%, rgba(0,0,0,0.35) 100%)',
              }}
            />
            <div
              className="absolute top-0 bottom-0 left-1/2 right-0 pointer-events-none z-10 hidden md:block"
              style={{
                background:
                  'linear-gradient(to left, rgba(0,0,0,0.05) 0%, rgba(255,255,255,0.08) 25%, transparent 60%, rgba(0,0,0,0.18) 95%, rgba(0,0,0,0.35) 100%)',
              }}
            />

            {/* 9. Render Canvas Container (Book Paper Surface) */}
            <div
              ref={viewerRef}
              className="w-full h-full relative overflow-hidden rounded-xs bg-[#faf8f5] shadow-inner"
              style={{ minHeight: '100%' }}
            />
          </div>
        ) : (
          <>
            {/* Standard Clean EPUB Render Canvas Container */}
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
          </>
        )}

        {/* Stage-Anchored Left Navigation Button */}
        {!isLoadingBook && !loadError && (
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

        {/* Stage-Anchored Right Navigation Button */}
        {!isLoadingBook && !loadError && (
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

      {/* Bookmarks & Annotations Drawer */}
      <BookmarksSidebar
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookId={bookId}
        bookTitle={bookTitle}
        currentLocationType={LocationType.EPUB_CFI}
        currentLocationValue={currentCfi}
        currentProgressPercentage={progressPercentage}
        currentLabel={currentChapter || `Page ${currentPage || ''}`}
        onJumpToLocation={handleJumpToLocation}
        theme={theme}
      />

      {/* Reader Settings Modal */}
      <ReaderSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
