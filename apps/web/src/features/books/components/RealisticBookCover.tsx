import React, { useState } from 'react';
import { BookFormat } from '@bookflow/shared-types';
import { BookOpen } from 'lucide-react';

interface RealisticBookCoverProps {
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  format?: BookFormat;
  isReading?: boolean;
  className?: string;
}

// Clean book titles by fixing Mojibake, stripping extensions, and normalizing spaces
export function formatBookTitle(title: string): string {
  if (!title) return '';
  let cleaned = title;
  try {
    if (/[\u00C0-\u00FF][\u0080-\u00BF]/.test(cleaned) || /[\xC2\xC3][\x80-\xBF]/.test(cleaned)) {
      cleaned = new TextDecoder('utf-8').decode(Uint8Array.from(cleaned, (c) => c.charCodeAt(0)));
    }
  } catch {
    // fallback
  }
  return cleaned
    .replace(/\.(pdf|epub|mobi|azw3)$/i, '')
    .split('')
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code >= 32 && code !== 127 && (code < 128 || code > 159) && c !== '\u00AC';
    })
    .join('')
    .replace(/_+/g, ' ')
    .trim();
}

// Deterministic palette selector based on book title
function getCoverPalette(title: string) {
  const palettes = [
    {
      name: 'Oxford Navy',
      bg: 'from-[#0d1b2a] via-[#1b263b] to-[#0d1b2a]',
      border: 'border-amber-400/40',
      accent: 'text-amber-200',
      spine: 'bg-[#08111a]',
      ornament: '#f6d365',
    },
    {
      name: 'Imperial Burgundy',
      bg: 'from-[#2b0c10] via-[#421219] to-[#2b0c10]',
      border: 'border-amber-300/40',
      accent: 'text-amber-100',
      spine: 'bg-[#1b070a]',
      ornament: '#fda085',
    },
    {
      name: 'Emerald Forest',
      bg: 'from-[#0b2016] via-[#123324] to-[#0b2016]',
      border: 'border-emerald-300/40',
      accent: 'text-emerald-100',
      spine: 'bg-[#06130d]',
      ornament: '#84fab0',
    },
    {
      name: 'Royal Plum',
      bg: 'from-[#1c0f24] via-[#2d183a] to-[#1c0f24]',
      border: 'border-purple-300/40',
      accent: 'text-purple-100',
      spine: 'bg-[#120a17]',
      ornament: '#d4fc79',
    },
    {
      name: 'Antique Leather',
      bg: 'from-[#2e1c11] via-[#452a19] to-[#2e1c11]',
      border: 'border-amber-400/40',
      accent: 'text-amber-100',
      spine: 'bg-[#1d120a]',
      ornament: '#f6d365',
    },
    {
      name: 'Charcoal Obsidian',
      bg: 'from-[#141414] via-[#222222] to-[#141414]',
      border: 'border-neutral-400/30',
      accent: 'text-neutral-200',
      spine: 'bg-[#0a0a0a]',
      ornament: '#e0e0e0',
    },
  ];

  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index] ?? palettes[0]!;
}

export const RealisticBookCover: React.FC<RealisticBookCoverProps> = ({
  title,
  author,
  coverUrl,
  format: _format,
  isReading = false,
  className = '',
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const cleanTitle = formatBookTitle(title);
  const palette = getCoverPalette(cleanTitle || title);
  const hasRealImage = Boolean(coverUrl && !imageFailed);

  return (
    <div
      className={`group relative aspect-[2/3] w-full select-none transition-all duration-300 transform-gpu perspective-[1200px] hover:-translate-y-1.5 hover:rotate-[-1.5deg] ${className}`}
      style={{
        filter:
          'drop-shadow(3px 8px 12px rgba(0, 0, 0, 0.35)) drop-shadow(1px 2px 4px rgba(0, 0, 0, 0.2))',
      }}
    >
      {/* Physical 3D Book Base Container */}
      <div className="relative w-full h-full rounded-r-md rounded-l-xs overflow-hidden flex bg-neutral-900 border-t border-b border-r border-black/40">
        {/* Physical Rounded Spine (Left Edge) */}
        <div className="relative w-4.5 sm:w-5 h-full bg-gradient-to-r from-black/80 via-black/20 to-black/60 flex-shrink-0 z-20 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.6)]">
          {/* Subtle Horizontal Spine Ribs (traditional bookbinding cords) */}
          <div className="absolute inset-0 flex flex-col justify-around py-6 opacity-30 pointer-events-none">
            <div className="h-0.5 bg-black border-t border-white/20" />
            <div className="h-0.5 bg-black border-t border-white/20" />
            <div className="h-0.5 bg-black border-t border-white/20" />
            <div className="h-0.5 bg-black border-t border-white/20" />
          </div>
        </div>

        {/* Book Spine Crease / Hinge Shadow (the indent where the cover flexes) */}
        <div
          className="absolute left-4.5 sm:left-5 top-0 bottom-0 w-2.5 pointer-events-none z-30"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(255,255,255,0.15) 30%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          }}
        />

        {/* Main Cover Face */}
        <div className="relative flex-1 h-full overflow-hidden">
          {hasRealImage ? (
            /* Real Book Cover Image with Physical Sheen */
            <div className="w-full h-full relative">
              <img
                src={coverUrl!}
                alt={title}
                onError={() => setImageFailed(true)}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Glossy / Satin Paper Sheen Highlight */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
                style={{
                  background:
                    'linear-gradient(115deg, rgba(255,255,255,0.4) 0%, transparent 40%, rgba(0,0,0,0.3) 100%)',
                }}
              />
            </div>
          ) : (
            /* Procedural Collector's Edition Vintage Hardcover */
            <div
              className={`w-full h-full bg-gradient-to-b ${palette.bg} p-4 sm:p-5 flex flex-col justify-between text-center relative overflow-hidden`}
            >
              {/* Cloth / Leather Texture Overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                  backgroundSize: '4px 4px',
                }}
              />

              {/* Gilded Double Border & Ornate Corners */}
              <div
                className={`absolute inset-2 sm:inset-3 border-2 ${palette.border} rounded-sm pointer-events-none flex items-center justify-center p-1`}
              >
                <div className={`w-full h-full border ${palette.border} opacity-70`} />
              </div>

              {/* Top Header: Format & Emblem */}
              <div className="relative z-10 pt-2">
                <div className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-amber-200/90 shadow-xs">
                  <BookOpen className="w-2.5 h-2.5" />
                  <span>CLASSIC EDITION</span>
                </div>
              </div>

              {/* Center: Embossed Book Title & Author */}
              <div className="relative z-10 px-2 my-auto">
                <h3
                  className={`font-serif text-sm sm:text-base font-bold leading-snug tracking-tight text-white line-clamp-3`}
                  style={{
                    textShadow:
                      '0 1px 2px rgba(0,0,0,0.9), 0 0 10px rgba(255,215,0,0.2), 0 -1px 1px rgba(255,255,255,0.2)',
                  }}
                >
                  {cleanTitle || title}
                </h3>

                {author && (
                  <p
                    className={`font-serif text-[11px] sm:text-xs mt-2 italic tracking-wide ${palette.accent} line-clamp-1`}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {author}
                  </p>
                )}
              </div>

              {/* Bottom: Classic Printer's Ornament Emblem */}
              <div className="relative z-10 pb-1 flex justify-center opacity-80">
                <svg
                  className="w-8 h-4 text-amber-300/80"
                  viewBox="0 0 40 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                >
                  <path d="M5 10 C 15 2, 25 2, 35 10 C 25 18, 15 18, 5 10 Z" />
                  <circle cx="20" cy="10" r="2.5" fill="currentColor" />
                </svg>
              </div>
            </div>
          )}

          {/* Right Edge: Stacked Paper Pages Simulation (3D Book Block) */}
          <div
            className="absolute top-0 bottom-0 right-0 w-2.5 pointer-events-none z-20"
            style={{
              background:
                'repeating-linear-gradient(to right, #fbf7ee 0px, #fbf7ee 1px, #e4d8c2 2px, #fbf7ee 3px)',
              boxShadow: 'inset 2px 0 3px rgba(0,0,0,0.25)',
            }}
          />

          {/* Bottom Edge: Paper Pages Depth */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1.5 pointer-events-none z-20"
            style={{
              background:
                'repeating-linear-gradient(to bottom, #fbf7ee 0px, #fbf7ee 1px, #d8cca8 2px)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
            }}
          />
        </div>

        {/* Satin Bookmark Ribbon (for currently reading books) */}
        {isReading && (
          <div
            className="absolute -top-1 right-5 w-3 h-8 bg-red-600 shadow-md z-40 flex items-end justify-center pb-1 pointer-events-none transition-transform group-hover:translate-y-1"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
            }}
          />
        )}
      </div>
    </div>
  );
};
