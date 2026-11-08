import React from 'react';
import { X, BookOpen, ChevronRight, Bookmark } from 'lucide-react';
import { NavItem } from 'epubjs';
import { ReaderTheme } from '../stores/reader-store';

interface ReaderTocSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  toc: NavItem[];
  currentHref?: string;
  onSelectChapter: (href: string) => void;
  theme: ReaderTheme;
}

export const ReaderTocSidebar: React.FC<ReaderTocSidebarProps> = ({
  isOpen,
  onClose,
  toc,
  currentHref,
  onSelectChapter,
  theme,
}) => {
  if (!isOpen) return null;

  const sidebarThemeClasses = {
    light: 'bg-white border-neutral-200 text-neutral-800',
    sepia: 'bg-[#fbf4e2] border-[#e4d5b7] text-[#4a3b2c]',
    dark: 'bg-[#181614] border-neutral-800 text-[#e4e2dd]',
  }[theme];

  const itemHoverClasses = {
    light: 'hover:bg-neutral-100 text-neutral-700',
    sepia: 'hover:bg-[#ede0c2] text-[#4a3b2c]',
    dark: 'hover:bg-neutral-800 text-neutral-300',
  }[theme];

  const itemActiveClasses = {
    light: 'bg-primary/10 text-primary font-semibold',
    sepia: 'bg-[#ebd8b3] text-[#3d2e20] font-semibold',
    dark: 'bg-neutral-800 text-amber-400 font-semibold',
  }[theme];

  const renderNavItems = (items: NavItem[], depth = 0) => {
    return (
      <ul className={`space-y-1 ${depth > 0 ? 'ml-3 border-l border-current/10 pl-2 mt-1' : ''}`}>
        {items.map((item, index) => {
          const isActive = currentHref && item.href && currentHref.includes(item.href);
          const hasChildren = item.subitems && item.subitems.length > 0;

          return (
            <li key={`${item.id || item.href}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  onSelectChapter(item.href);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 group ${
                  isActive ? itemActiveClasses : itemHoverClasses
                }`}
              >
                <span className="truncate">{item.label?.trim() || `Chapter ${index + 1}`}</span>
                {hasChildren && (
                  <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                )}
              </button>

              {hasChildren && renderNavItems(item.subitems!, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

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
        aria-label="Table of Contents"
      >
        {/* Header */}
        <div className="p-4 border-b border-current/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 opacity-75" />
            <h2 className="text-sm font-bold tracking-tight">Table of Contents</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close Table of Contents"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {toc.length === 0 ? (
            <div className="py-12 text-center opacity-60 text-xs">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No chapters or Table of Contents found in this book.</p>
            </div>
          ) : (
            renderNavItems(toc)
          )}
        </div>
      </aside>
    </div>
  );
};
