import { create } from 'zustand';

export type ReaderTheme = 'light' | 'sepia' | 'dark';
export type ReaderFont = 'serif' | 'sans' | 'mono';
export type ReaderLayout = 'auto' | 'two-page' | 'single-page';

export interface ReaderSettingsState {
  fontSize: number;
  fontFamily: ReaderFont;
  lineHeight: number;
  theme: ReaderTheme;
  layout: ReaderLayout;
  setFontSize: (size: number) => void;
  setFontFamily: (font: ReaderFont) => void;
  setLineHeight: (height: number) => void;
  setTheme: (theme: ReaderTheme) => void;
  setLayout: (layout: ReaderLayout) => void;
  applySettings: (settings: Partial<ReaderSettingsState>) => void;
}

const STORAGE_KEY = 'bookflow_reader_settings';

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

function loadStoredSettings(): Partial<ReaderSettingsState> {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistSettings(state: ReaderSettingsState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const toSave = {
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      lineHeight: state.lineHeight,
      theme: state.theme,
      layout: state.layout,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export const useReaderStore = create<ReaderSettingsState>((set, get) => {
  const initial = loadStoredSettings();

  return {
    fontSize: initial.fontSize ?? 18,
    fontFamily: initial.fontFamily ?? 'serif',
    lineHeight: initial.lineHeight ?? 1.6,
    theme: initial.theme ?? 'sepia',
    layout: initial.layout ?? 'auto',

    setFontSize: (fontSize) => {
      set({ fontSize });
      persistSettings(get());
    },
    setFontFamily: (fontFamily) => {
      set({ fontFamily });
      persistSettings(get());
    },
    setLineHeight: (lineHeight) => {
      set({ lineHeight });
      persistSettings(get());
    },
    setTheme: (theme) => {
      set({ theme });
      persistSettings(get());
    },
    setLayout: (layout) => {
      set({ layout });
      persistSettings(get());
    },
    applySettings: (settings) => {
      set(settings);
      persistSettings(get());
    },
  };
});
