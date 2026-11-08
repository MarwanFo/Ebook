import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, List, Sliders, Maximize2, Minimize2 } from 'lucide-react';
import { ReaderTheme } from '../stores/reader-store';

interface ReaderHeaderProps {
  title: string;
  author?: string | null;
  chapterTitle?: string;
  theme: ReaderTheme;
  isTocOpen: boolean;
  onToggleToc: () => void;
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
  isTocOpen,
  onToggleToc,
  isSettingsOpen,
  onToggleSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const navigate = useNavigate();

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

      {/* Right Section: Action Controls */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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
