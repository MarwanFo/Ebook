import React, { useState, useEffect, useRef } from 'react';
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
  MoreVertical,
} from 'lucide-react';
import { usePdfStore, PdfTheme } from '../stores/pdf-store';
import { formatBookTitle } from '../../books/components/RealisticBookCover';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Click outside to close mobile controls menu
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

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

  const menuThemeClasses = {
    light: 'bg-white/98 border-neutral-200 text-neutral-800 shadow-2xl',
    sepia: 'bg-[#fbf4e2]/98 border-[#e4d5b7] text-[#4a3b2c] shadow-2xl',
    dark: 'bg-[#1e1b18]/98 border-neutral-800 text-[#e4e2dd] shadow-2xl',
  }[theme];

  return (
    <header
      className={`h-14 px-2.5 sm:px-6 border-b flex items-center justify-between gap-1.5 sm:gap-4 transition-colors duration-200 z-30 select-none relative ${headerThemeClasses}`}
    >
      {/* Left Section: Back button & Book Metadata */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-medium flex-shrink-0 ${buttonHoverClasses}`}
          title="Back to Library"
          aria-label="Back to Library"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline">Library</span>
        </button>

        <div className="h-4 w-px bg-current opacity-20 hidden sm:block flex-shrink-0" />

        <div className="min-w-0 flex-1">
          <h1 className="text-xs sm:text-sm font-bold truncate tracking-tight">
            {formatBookTitle(title) || title}
          </h1>
          {author && <p className="text-[10px] sm:text-xs opacity-60 truncate">by {author}</p>}
        </div>
      </div>

      {/* Center Section: Page Jump Navigation */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={handlePageSubmit}
            className="w-9 sm:w-12 text-center py-0.5 sm:py-1 text-xs border rounded-md bg-transparent border-current/20 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            title="Current page (press Enter to jump)"
            aria-label="Current page"
          />
          <span className="text-[11px] sm:text-xs opacity-60 font-mono">/ {totalPages || 1}</span>
        </form>
      </div>

      {/* Right Section: Zoom, View Modes, Theme & Fullscreen Controls */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        {/* Zoom Controls (Desktop only >= 1024px) */}
        <div className="hidden lg:flex items-center gap-0.5 border-r border-current/15 pr-2 mr-1">
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

        {/* View Mode Toggle (Desktop & Tablet >= 768px) */}
        <div className="hidden md:flex items-center gap-0.5 border-r border-current/15 pr-2 mr-1">
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
            onClick={() => setViewMode('continuous')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'continuous' ? activeBtnClasses : buttonHoverClasses
            }`}
            title="Continuous Scroll Mode"
            aria-label="Continuous Scroll Mode"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        {/* Rotation (Desktop & Tablet >= 768px) */}
        <button
          type="button"
          onClick={rotateClockwise}
          className={`hidden md:flex p-1.5 rounded-lg transition-colors ${buttonHoverClasses}`}
          title="Rotate Clockwise"
          aria-label="Rotate Clockwise"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Thumbnails Toggle (Desktop & Tablet >= 768px) */}
        <button
          type="button"
          onClick={onToggleThumbnails}
          className={`hidden md:flex p-1.5 rounded-lg transition-colors ${
            isThumbnailsOpen ? activeBtnClasses : buttonHoverClasses
          }`}
          title="Page Thumbnails"
          aria-label="Page Thumbnails"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* Outline / TOC Toggle (Always Visible) */}
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

        {/* Bookmarks & Notes Toggle (Always Visible) */}
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

        {/* Palette Selector (Always Visible) */}
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

        {/* Fullscreen Toggle (Tablet & Desktop >= 640px) */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`hidden sm:flex p-1.5 rounded-lg transition-colors ${buttonHoverClasses}`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Mobile & Small Screen More Controls Menu Button (< 768px) */}
        <div className="relative md:hidden" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isMenuOpen ? activeBtnClasses : buttonHoverClasses
            }`}
            title="More Options"
            aria-label="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu Modal */}
          {isMenuOpen && (
            <div
              className={`absolute right-0 top-full mt-2 w-56 rounded-2xl p-2.5 z-50 border backdrop-blur-xl animate-fade-in ${menuThemeClasses}`}
            >
              {/* View Modes Header */}
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-50 px-2 py-1">
                View Mode
              </div>
              <div className="grid grid-cols-2 gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('flipbook');
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === 'flipbook' ? activeBtnClasses : buttonHoverClasses
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>3D Flip</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('single-page');
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === 'single-page' ? activeBtnClasses : buttonHoverClasses
                  }`}
                >
                  <Square className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Single</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('two-page');
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === 'two-page' ? activeBtnClasses : buttonHoverClasses
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Spread</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('continuous');
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === 'continuous' ? activeBtnClasses : buttonHoverClasses
                  }`}
                >
                  <AlignJustify className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Scroll</span>
                </button>
              </div>

              {/* Tools Divider */}
              <div className="h-px bg-current opacity-10 my-1" />

              {/* Tools Actions */}
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-50 px-2 py-1">
                Actions
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onToggleThumbnails();
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${buttonHoverClasses}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Page Thumbnails</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    rotateClockwise();
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${buttonHoverClasses}`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleFullscreen();
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${buttonHoverClasses}`}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </button>
              </div>

              {/* Zoom Controls on Mobile */}
              <div className="h-px bg-current opacity-10 my-1" />
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-50 px-2 py-1">
                Zoom
              </div>
              <div className="flex items-center justify-between gap-1 px-1">
                <button
                  type="button"
                  onClick={zoomOut}
                  className={`p-1.5 rounded-lg transition-colors flex-1 flex justify-center ${buttonHoverClasses}`}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomMode(zoomMode === 'fit-width' ? 'custom' : 'fit-width');
                    setIsMenuOpen(false);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    zoomMode === 'fit-width' ? activeBtnClasses : buttonHoverClasses
                  }`}
                >
                  Fit W
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  className={`p-1.5 rounded-lg transition-colors flex-1 flex justify-center ${buttonHoverClasses}`}
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
