import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Columns2,
  Square,
  AlignJustify,
  RotateCw,
  List,
  LayoutGrid,
  Sun,
  Moon,
  Coffee,
  Bookmark,
  BookOpen,
} from 'lucide-react';
import { usePdfStore, PdfTheme } from '../stores/pdf-store';

interface PdfReaderHeaderProps {
  title: string;
  author?: string | null;
  currentPage: number;
  totalPages: number;
  onJumpToPage: (page: number) => void;
  isTocOpen: boolean;
  onToggleToc: () => void;
  isThumbnailsOpen: boolean;
  onToggleThumbnails: () => void;
  isBookmarksOpen?: boolean;
  onToggleBookmarks?: () => void;
  bookmarkCount?: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const PdfReaderHeader: React.FC<PdfReaderHeaderProps> = ({
  title,
  author,
  currentPage,
  totalPages,
  onJumpToPage,
  isTocOpen,
  onToggleToc,
  isThumbnailsOpen,
  onToggleThumbnails,
  isBookmarksOpen = false,
  onToggleBookmarks,
  bookmarkCount = 0,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const navigate = useNavigate();
  const {
    zoom,
    zoomMode,
    viewMode,
    theme,
    zoomIn,
    zoomOut,
    setZoomMode,
    setViewMode,
    setTheme,
    rotateClockwise,
  } = usePdfStore();

  const [pageInput, setPageInput] = useState<string>(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onJumpToPage(pageNum);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const headerThemeClasses = {
    light: 'bg-white/95 border-neutral-200 text-neutral-800 backdrop-blur-md',
    sepia: 'bg-[#fbf4e2]/95 border-[#e4d5b7] text-[#4a3b2c] backdrop-blur-md',
    dark: 'bg-[#181614]/95 border-neutral-800 text-[#e4e2dd] backdrop-blur-md',
  }[theme];

  const buttonHoverClasses = {
    light: 'hover:bg-neutral-100 text-neutral-700',
    sepia: 'hover:bg-[#ede0c2] text-[#4a3b2c]',
    dark: 'hover:bg-neutral-800 text-neutral-300',
  }[theme];

  const activeBtnClasses = {
    light: 'bg-neutral-200 text-neutral-900',
    sepia: 'bg-[#ded0b0] text-[#3d2e20]',
    dark: 'bg-neutral-700 text-white',
  }[theme];

  return (
    <header
      className={`h-14 px-3 sm:px-6 border-b flex items-center justify-between gap-2 sm:gap-4 transition-colors duration-200 z-30 select-none ${headerThemeClasses}`}
    >
      {/* Left Section: Back button & Book Metadata */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-medium ${buttonHoverClasses}`}
          title="Back to Library"
          aria-label="Back to Library"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline">Library</span>
        </button>

        <div className="h-4 w-px bg-current opacity-20 hidden sm:block" />

        <div className="min-w-0 flex-1">
          <h1 className="text-xs sm:text-sm font-bold truncate tracking-tight">{title}</h1>
          {author && <p className="text-[10px] sm:text-xs opacity-60 truncate">by {author}</p>}
        </div>
      </div>

      {/* Center Section: Page Jump Navigation */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={handlePageSubmit}
            className="w-10 sm:w-12 text-center py-1 text-xs border rounded-md bg-transparent border-current/20 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            title="Current page (press Enter to jump)"
            aria-label="Current page"
          />
          <span className="text-xs opacity-60 font-mono">/ {totalPages || 1}</span>
        </form>
      </div>

      {/* Right Section: Zoom, View Modes, Theme & Fullscreen Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Zoom Controls (Hidden on narrow mobile) */}
        <div className="hidden sm:flex items-center gap-0.5 border-r border-current/15 pr-2 mr-1">
          <button
            type="button"
            onClick={zoomOut}
            className={`p-1.5 rounded-lg transition-colors ${buttonHoverClasses}`}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium px-1.5 min-w-[3rem] text-center">
            {zoomMode === 'fit-width'
              ? 'Width'
              : zoomMode === 'fit-page'
                ? 'Page'
                : `${Math.round(zoom * 100)}%`}
          </span>
          <button
            type="button"
            onClick={zoomIn}
            className={`p-1.5 rounded-lg transition-colors ${buttonHoverClasses}`}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomMode(zoomMode === 'fit-width' ? 'custom' : 'fit-width')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              zoomMode === 'fit-width' ? activeBtnClasses : buttonHoverClasses
            }`}
            title="Fit to Width"
          >
            Fit W
          </button>
        </div>

        {/* View Mode Toggle: Two-Page vs Single vs Continuous */}
        <div className="flex items-center gap-0.5 border-r border-current/15 pr-2 mr-1">
          <button
            type="button"
            onClick={() => setViewMode('two-page')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'two-page' ? activeBtnClasses : buttonHoverClasses
            }`}
            title="Two-Page Spread (Facing Pages)"
            aria-label="Two-Page Spread"
          >
            <Columns2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('single-page')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'single-page' ? activeBtnClasses : buttonHoverClasses
            }`}
            title="Single Page View"
            aria-label="Single Page View"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('continuous')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'continuous' ? activeBtnClasses : buttonHoverClasses
            }`}
            title="Continuous Scroll Mode"
            aria-label="Continuous Scroll Mode"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flipbook')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'flipbook' ? activeBtnClasses : buttonHoverClasses
            }`}
            title="Interactive 3D FlipBook"
            aria-label="Interactive 3D FlipBook"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>

        {/* Rotation */}
        <button
          type="button"
          onClick={rotateClockwise}
          className={`p-1.5 rounded-lg transition-colors ${buttonHoverClasses}`}
          title="Rotate Clockwise"
          aria-label="Rotate Clockwise"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Thumbnails Toggle */}
        <button
          type="button"
          onClick={onToggleThumbnails}
          className={`p-1.5 rounded-lg transition-colors ${
            isThumbnailsOpen ? activeBtnClasses : buttonHoverClasses
          }`}
          title="Page Thumbnails"
          aria-label="Page Thumbnails"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* Outline / TOC Toggle */}
        <button
          type="button"
          onClick={onToggleToc}
          className={`p-1.5 rounded-lg transition-colors ${
            isTocOpen ? activeBtnClasses : buttonHoverClasses
          }`}
          title="Document Outline"
          aria-label="Document Outline"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Bookmarks & Notes Toggle */}
        {onToggleBookmarks && (
          <button
            type="button"
            onClick={onToggleBookmarks}
            className={`p-1.5 rounded-lg transition-colors relative ${
              isBookmarksOpen ? activeBtnClasses : buttonHoverClasses
            }`}
            title="Bookmarks and Notes"
            aria-label="Bookmarks and Notes"
          >
            <Bookmark className="w-4 h-4" />
            {bookmarkCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[14px] h-3.5 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
                {bookmarkCount > 99 ? '99+' : bookmarkCount}
              </span>
            )}
          </button>
        )}

        {/* Palette Selector */}
        <button
          type="button"
          onClick={() => {
            const nextTheme: PdfTheme =
              theme === 'sepia' ? 'dark' : theme === 'dark' ? 'light' : 'sepia';
            setTheme(nextTheme);
          }}
          className={`p-1.5 rounded-lg transition-colors ${buttonHoverClasses}`}
          title={`Theme Palette: ${theme}`}
          aria-label="Toggle Palette"
        >
          {theme === 'light' ? (
            <Sun className="w-4 h-4" />
          ) : theme === 'dark' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Coffee className="w-4 h-4" />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`p-1.5 rounded-lg transition-colors ${buttonHoverClasses}`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
