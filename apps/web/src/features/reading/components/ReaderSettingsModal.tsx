import React from 'react';
import { X, Type, Sun, Moon, Coffee, Columns2, Square, Sparkles } from 'lucide-react';
import { useReaderStore, ReaderTheme, ReaderFont, ReaderLayout } from '../stores/reader-store';

interface ReaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    theme,
    fontFamily,
    fontSize,
    lineHeight,
    layout,
    setTheme,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setLayout,
  } = useReaderStore();

  if (!isOpen) return null;

  const modalThemeClasses = {
    light: 'bg-white border-neutral-200 text-neutral-800 shadow-2xl',
    sepia: 'bg-[#fbf4e2] border-[#e4d5b7] text-[#4a3b2c] shadow-2xl',
    dark: 'bg-[#181614] border-neutral-800 text-[#e4e2dd] shadow-2xl',
  }[theme];

  const themes: Array<{
    id: ReaderTheme;
    label: string;
    icon: typeof Sun;
    bg: string;
    text: string;
    border: string;
  }> = [
    {
      id: 'light',
      label: 'Light',
      icon: Sun,
      bg: 'bg-white',
      text: 'text-neutral-900',
      border: 'border-neutral-300',
    },
    {
      id: 'sepia',
      label: 'Sepia',
      icon: Coffee,
      bg: 'bg-[#f5edd6]',
      text: 'text-[#4a3b2c]',
      border: 'border-[#dfd3b9]',
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: Moon,
      bg: 'bg-[#121110]',
      text: 'text-neutral-100',
      border: 'border-neutral-700',
    },
  ];

  const fontFamilies: Array<{ id: ReaderFont; label: string; className: string }> = [
    { id: 'serif', label: 'Serif (Merriweather)', className: 'font-serif' },
    { id: 'sans', label: 'Sans-Serif (Inter)', className: 'font-sans' },
    { id: 'mono', label: 'Monospace (Code)', className: 'font-mono' },
  ];

  const layouts: Array<{ id: ReaderLayout; label: string; icon: typeof Columns2; desc: string }> = [
    { id: 'auto', label: 'Adaptive', icon: Sparkles, desc: 'Responsive 2-page or 1-page' },
    { id: 'two-page', label: 'Two Pages', icon: Columns2, desc: 'Authentic book spread' },
    { id: 'single-page', label: 'Single Page', icon: Square, desc: 'Continuous single column' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full max-w-md rounded-2xl border p-6 z-10 animate-fade-in ${modalThemeClasses}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-settings-heading"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-current/10">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 opacity-75" />
            <h2 id="reader-settings-heading" className="text-base font-bold tracking-tight">
              Reader Appearance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-6 text-xs">
          {/* Theme Palette Selection */}
          <div>
            <label className="block font-semibold opacity-70 mb-2 uppercase tracking-wider text-[10px]">
              Theme Palette
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {themes.map((t) => {
                const Icon = t.icon;
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      t.bg
                    } ${t.text} ${
                      isSelected
                        ? 'ring-2 ring-amber-500 shadow-md font-bold scale-[1.02]'
                        : 'opacity-85 hover:opacity-100'
                    } ${t.border}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography Selection */}
          <div>
            <label className="block font-semibold opacity-70 mb-2 uppercase tracking-wider text-[10px]">
              Font Family
            </label>
            <div className="grid grid-cols-3 gap-2">
              {fontFamilies.map((f) => {
                const isSelected = fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontFamily(f.id)}
                    className={`py-2 px-3 rounded-lg border text-center transition-all ${
                      f.className
                    } ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 font-bold'
                        : 'border-current/15 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {f.id === 'serif' ? 'Serif' : f.id === 'sans' ? 'Sans' : 'Mono'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size & Line Height Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Font Size Stepper */}
            <div>
              <label className="block font-semibold opacity-70 mb-2 uppercase tracking-wider text-[10px]">
                Font Size: {fontSize}px
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  className="flex-1 py-1.5 px-3 rounded-lg border border-current/20 font-bold hover:bg-current/10 transition-colors"
                  title="Decrease font size"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                  className="flex-1 py-1.5 px-3 rounded-lg border border-current/20 font-bold hover:bg-current/10 transition-colors"
                  title="Increase font size"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Line Height Selector */}
            <div>
              <label className="block font-semibold opacity-70 mb-2 uppercase tracking-wider text-[10px]">
                Line Height
              </label>
              <div className="flex items-center gap-1">
                {[1.4, 1.6, 1.8, 2.0].map((lh) => {
                  const isSelected = lineHeight === lh;
                  return (
                    <button
                      key={lh}
                      type="button"
                      onClick={() => setLineHeight(lh)}
                      className={`flex-1 py-1.5 rounded-lg border text-center transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 font-bold'
                          : 'border-current/15 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {lh}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Page Spread Layout Mode */}
          <div>
            <label className="block font-semibold opacity-70 mb-2 uppercase tracking-wider text-[10px]">
              Page Layout Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {layouts.map((l) => {
                const isSelected = layout === l.id;
                const Icon = l.icon;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLayout(l.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 font-bold'
                        : 'border-current/15 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-[11px]">{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-current/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
