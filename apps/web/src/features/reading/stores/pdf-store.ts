import { create } from 'zustand';

export type PdfZoomMode = 'custom' | 'fit-width' | 'fit-page';
export type PdfViewMode = 'two-page' | 'single-page' | 'continuous' | 'flipbook';
export type PdfTheme = 'light' | 'sepia' | 'dark';

export interface PdfSettingsState {
  zoom: number;
  zoomMode: PdfZoomMode;
  viewMode: PdfViewMode;
  theme: PdfTheme;
  rotation: number;
  setZoom: (zoom: number) => void;
  setZoomMode: (mode: PdfZoomMode) => void;
  setViewMode: (mode: PdfViewMode) => void;
  setTheme: (theme: PdfTheme) => void;
  setRotation: (deg: number) => void;
  rotateClockwise: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const STORAGE_KEY = 'bookflow_pdf_settings';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function loadStoredPdfSettings(): Partial<PdfSettingsState> {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistPdfSettings(state: PdfSettingsState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const toSave = {
      zoom: state.zoom,
      zoomMode: state.zoomMode,
      viewMode: state.viewMode,
      theme: state.theme,
      rotation: state.rotation,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export const usePdfStore = create<PdfSettingsState>((set, get) => {
  const initial = loadStoredPdfSettings();

  return {
    zoom: initial.zoom ?? 1.0,
    zoomMode: initial.zoomMode ?? 'fit-width',
    viewMode: initial.viewMode ?? 'two-page',
    theme: initial.theme ?? 'sepia',
    rotation: initial.rotation ?? 0,

    setZoom: (zoom) => {
      const clamped = Math.min(2.5, Math.max(0.4, Math.round(zoom * 10) / 10));
      set({ zoom: clamped, zoomMode: 'custom' });
      persistPdfSettings(get());
    },
    setZoomMode: (zoomMode) => {
      set({ zoomMode });
      persistPdfSettings(get());
    },
    setViewMode: (viewMode) => {
      set({ viewMode });
      persistPdfSettings(get());
    },
    setTheme: (theme) => {
      set({ theme });
      persistPdfSettings(get());
    },
    setRotation: (rotation) => {
      set({ rotation: rotation % 360 });
      persistPdfSettings(get());
    },
    rotateClockwise: () => {
      const next = (get().rotation + 90) % 360;
      set({ rotation: next });
      persistPdfSettings(get());
    },
    zoomIn: () => {
      const current = get().zoom;
      const next = Math.min(2.5, Math.round((current + 0.2) * 10) / 10);
      set({ zoom: next, zoomMode: 'custom' });
      persistPdfSettings(get());
    },
    zoomOut: () => {
      const current = get().zoom;
      const next = Math.max(0.4, Math.round((current - 0.2) * 10) / 10);
      set({ zoom: next, zoomMode: 'custom' });
      persistPdfSettings(get());
    },
  };
});
