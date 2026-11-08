import React from 'react';
import { X, LayoutGrid } from 'lucide-react';
import { PdfTheme } from '../stores/pdf-store';

interface PdfThumbnailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
  theme: PdfTheme;
}

export const PdfThumbnailsSidebar: React.FC<PdfThumbnailsSidebarProps> = ({
  isOpen,
  onClose,
  totalPages,
  currentPage,
  onSelectPage,
  theme,
}) => {
  if (!isOpen) return null;

  const sidebarThemeClasses = {
    light: 'bg-white border-neutral-200 text-neutral-800',
    sepia: 'bg-[#fbf4e2] border-[#e4d5b7] text-[#4a3b2c]',
    dark: 'bg-[#181614] border-neutral-800 text-[#e4e2dd]',
  }[theme];

  const pageTileThemeClasses = {
    light: 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800',
    sepia: 'bg-[#f5edd6] hover:bg-[#ede0c2] border-[#e4d5b7] text-[#4a3b2c]',
    dark: 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200',
  }[theme];

  const activeTileClasses = 'ring-2 ring-amber-500 border-amber-500 font-bold shadow-md';

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`relative w-80 max-w-[85vw] h-full shadow-2xl border-r flex flex-col z-10 animate-slide-in-right ${sidebarThemeClasses}`}
        aria-label="Page Thumbnails Navigation"
      >
        {/* Header */}
        <div className="p-4 border-b border-current/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 opacity-75" />
            <h2 className="text-sm font-bold tracking-tight">Page Navigation</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close Thumbnails"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thumbnail Page Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2.5">
            {pages.map((pageNum) => {
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => {
                    onSelectPage(pageNum);
                    onClose();
                  }}
                  className={`aspect-[3/4] rounded-xl border flex flex-col items-center justify-center p-2 transition-all ${pageTileThemeClasses} ${
                    isActive ? activeTileClasses : ''
                  }`}
                  title={`Jump to Page ${pageNum}`}
                >
                  <span className="text-[10px] opacity-40 uppercase tracking-wider mb-1 font-mono">
                    Page
                  </span>
                  <span className="text-base font-bold font-mono">{pageNum}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};
