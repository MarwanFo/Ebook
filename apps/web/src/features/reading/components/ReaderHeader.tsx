import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  List,
  Sliders,
  Maximize2,
  Minimize2,
  Bookmark,
  BookOpen,
  Columns2,
  Square,
} from 'lucide-react';
import { ReaderTheme, ReaderLayout } from '../stores/reader-store';

interface ReaderHeaderProps {
  title: string;
  author?: string | null;
  chapterTitle?: string;
  theme: ReaderTheme;
  layout?: ReaderLayout;
  onLayoutChange?: (layout: ReaderLayout) => void;
  currentPage?: number;
  totalPages?: number;
  onJumpToPage?: (page: number) => void;
  isTocOpen: boolean;
  onToggleToc: () => void;
  isBookmarksOpen?: boolean;
  onToggleBookmarks?: () => void;
  bookmarkCount?: number;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  title,
  author,
  chapterTitle,
  theme,
  layout,
  onLayoutChange,
  currentPage,
  totalPages,
  onJumpToPage,
  isTocOpen,
  onToggleToc,
  isBookmarksOpen = false,
  onToggleBookmarks,
  bookmarkCount = 0,
  isSettingsOpen,
  onToggleSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const navigate = useNavigate();
  const [pageInput, setPageInput] = React.useState<string>(String(currentPage || 1));

  React.useEffect(() => {
    if (currentPage !== undefined) {
      setPageInput(String(currentPage));
    }
  }, [currentPage]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && totalPages && pageNum >= 1 && pageNum <= totalPages) {
      onJumpToPage?.(pageNum);
    } else if (currentPage !== undefined) {
      setPageInput(String(currentPage));
    }
  };

  // Dynamic theme-aware header styles
  const headerThemeClasses = {
    light: 'bg-white/90 border-neutral-200 text-neutral-800 backdrop-blur-md',
    sepia: 'bg-[#fbf4e2]/95 border-[#e4d5b7] text-[#4a3b2c] backdrop-blur-md',
    dark: 'bg-[#181614]/90 border-neutral-800 text-[#e4e2dd] backdrop-blur-md',
  }[theme];

  const buttonHoverClasses = {
    light: 'hover:bg-neutral-100 text-neutral-700',
    sepia: 'hover:bg-[#ede0c2] text-[#5c4a37]',
    dark: 'hover:bg-neutral-800 text-neutral-300',
  }[theme];

  const activeBtnClasses = {
    light: 'bg-neutral-200 text-neutral-900',
    sepia: 'bg-[#ded0b0] text-[#3d2e20]',
    dark: 'bg-neutral-700 text-white',
  }[theme];

  return (
    <header
      className={`h-14 px-3 sm:px-6 border-b flex items-center justify-between transition-colors duration-200 z-30 select-none ${headerThemeClasses}`}
    >
      {/* Left Section: Back button & Book Metadata */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-medium ${buttonHoverClasses}`}
          title="Back to Library"
          aria-label="Back to Library"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Library</span>
        </button>

        <div className="h-4 w-px bg-current opacity-20 hidden sm:block" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold truncate tracking-tight">{title}</h1>
            {author && (
              <span className="text-[11px] opacity-60 truncate hidden md:inline">by {author}</span>
            )}
          </div>
          {chapterTitle && (
            <p className="text-[10px] sm:text-xs opacity-75 truncate font-serif italic">
              {chapterTitle}
            </p>
          )}
        </div>
      </div>

      {/* Center Section: Page Jump Navigation */}
      {totalPages && totalPages > 0 ? (
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
            <span className="text-xs opacity-60 font-mono">/ {totalPages}</span>
          </form>
        </div>
      ) : null}

      {/* Right Section: Action Controls */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* View Mode Toggle: Mode Book vs Two-Page vs Single Page */}
        {onLayoutChange && (
          <div className="flex items-center gap-0.5 border-r border-current/15 pr-2 mr-1">
            <button
              type="button"
              onClick={() => onLayoutChange('book')}
              className={`p-1.5 rounded-lg transition-colors ${
                layout === 'book' || !layout ? activeBtnClasses : buttonHoverClasses
              }`}
              title="Mode Book (Interactive 3D Book)"
              aria-label="Mode Book"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('two-page')}
              className={`p-1.5 rounded-lg transition-colors ${
                layout === 'two-page' ? activeBtnClasses : buttonHoverClasses
              }`}
              title="Two-Page Spread"
              aria-label="Two-Page Spread"
            >
              <Columns2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('single-page')}
              className={`p-1.5 rounded-lg transition-colors ${
                layout === 'single-page' ? activeBtnClasses : buttonHoverClasses
              }`}
              title="Single Page View"
              aria-label="Single Page View"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Table of Contents Button */}
        <button
          type="button"
          onClick={onToggleToc}
          className={`p-2 rounded-lg transition-colors ${
            isTocOpen ? activeBtnClasses : buttonHoverClasses
          }`}
          title="Table of Contents"
          aria-label="Table of Contents"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Bookmarks & Notes Button */}
        {onToggleBookmarks && (
          <button
            type="button"
            onClick={onToggleBookmarks}
            className={`p-2 rounded-lg transition-colors relative ${
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

        {/* Reader Typography & Layout Settings Button */}
        <button
          type="button"
          onClick={onToggleSettings}
          className={`p-2 rounded-lg transition-colors ${
            isSettingsOpen ? activeBtnClasses : buttonHoverClasses
          }`}
          title="Display Settings"
          aria-label="Display Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`p-2 rounded-lg transition-colors ${buttonHoverClasses}`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
