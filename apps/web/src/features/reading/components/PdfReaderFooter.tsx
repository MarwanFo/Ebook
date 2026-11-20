import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PdfTheme } from '../stores/pdf-store';

interface PdfReaderFooterProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onSeekPage: (page: number) => void;
  canPrev?: boolean;
  canNext?: boolean;
  theme: PdfTheme;
}

export const PdfReaderFooter: React.FC<PdfReaderFooterProps> = ({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onSeekPage,
  canPrev = true,
  canNext = true,
  theme,
}) => {
  const footerThemeClasses = {
    light: 'bg-white/95 border-neutral-200 text-neutral-800 backdrop-blur-md',
    sepia: 'bg-[#fbf4e2]/95 border-[#e4d5b7] text-[#4a3b2c] backdrop-blur-md',
    dark: 'bg-[#181614]/95 border-neutral-800 text-[#e4e2dd] backdrop-blur-md',
  }[theme];

  const buttonHoverClasses = {
    light: 'hover:bg-neutral-100 disabled:opacity-30',
    sepia: 'hover:bg-[#ede0c2] disabled:opacity-30',
    dark: 'hover:bg-neutral-800 disabled:opacity-30',
  }[theme];

  const progressBgClass = {
    light: 'bg-neutral-200',
    sepia: 'bg-[#dfd3b9]',
    dark: 'bg-neutral-800',
  }[theme];

  const percentage =
    totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  return (
    <footer
      className={`h-12 px-4 sm:px-8 border-t flex items-center justify-between gap-4 transition-colors duration-200 z-30 select-none ${footerThemeClasses}`}
    >
      {/* Previous Button */}
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev || currentPage <= 1}
        className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors ${buttonHoverClasses}`}
        title="Previous Page (Left Arrow / PageUp)"
        aria-label="Previous Page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {/* Scrub Bar & Percentage Indicator */}
      <div className="flex-1 max-w-xl flex items-center gap-3">
        <div
          className={`relative flex-1 h-2 rounded-full overflow-hidden cursor-pointer ${progressBgClass}`}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            const targetPage = Math.max(1, Math.min(totalPages, Math.round(clickPos * totalPages)));
            onSeekPage(targetPage);
          }}
          title={`Click to jump to page (${percentage}%)`}
        >
          <div
            className="h-full bg-amber-600 transition-all duration-300 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono opacity-75 flex-shrink-0">
          <span>{percentage}%</span>
          <span className="opacity-60 hidden md:inline">
            (p. {currentPage}/{totalPages || 1})
          </span>
        </div>
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext || currentPage >= totalPages}
        className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors ${buttonHoverClasses}`}
        title="Next Page (Right Arrow / PageDown / Space)"
        aria-label="Next Page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </footer>
  );
};
