

import { create } from 'zustand';
import { ReaderTheme } from '@bookflow/shared-types';

interface UIState {
  theme: ReaderTheme;
  isSidebarOpen: boolean;
  setTheme: (theme: ReaderTheme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
}

const getInitialTheme = (): ReaderTheme => {
  if (typeof window === 'undefined') return ReaderTheme.LIGHT;
  const saved = localStorage.getItem('bookflow-theme') as ReaderTheme | null;
  if (saved && Object.values(ReaderTheme).includes(saved)) {
    return saved;
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return ReaderTheme.DARK;
  }
  return ReaderTheme.LIGHT;
};

const applyThemeClass = (theme: ReaderTheme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'sepia');
  if (theme === ReaderTheme.DARK) {
    root.classList.add('dark');
  } else if (theme === ReaderTheme.SEPIA) {
    root.classList.add('sepia');
  }
};

export const useUIStore = create<UIState>((set) => {
  const initialTheme = getInitialTheme();
  applyThemeClass(initialTheme);

  return {
    theme: initialTheme,
    isSidebarOpen: false,
    setTheme: (theme: ReaderTheme) => {
      localStorage.setItem('bookflow-theme', theme);
      applyThemeClass(theme);
      set({ theme });
    },
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (isSidebarOpen: boolean) => set({ isSidebarOpen }),
  };
});
