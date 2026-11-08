/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'epubjs' {
  export interface NavItem {
    id: string;
    href: string;
    label: string;
    subitems?: NavItem[];
  }

  export interface Navigation {
    toc: NavItem[];
    landmarks?: unknown[];
  }

  export interface RenditionOptions {
    width?: string | number;
    height?: string | number;
    spread?: 'none' | 'always' | 'auto';
    minSpreadWidth?: number;
    flow?: 'paginated' | 'scrolled' | 'scrolled-doc';
    manager?: string;
  }

  export interface Location {
    start: {
      cfi: string;
      displayed: { page: number; total: number };
      location: number;
      percentage: number;
    };
    end: {
      cfi: string;
      displayed: { page: number; total: number };
      location: number;
      percentage: number;
    };
    atStart?: boolean;
    atEnd?: boolean;
  }

  export interface Rendition {
    display(target?: string): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    resize(width?: number | string, height?: number | string): void;
    destroy(): void;
    currentLocation(): Location;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    themes: {
      fontSize(size: string): void;
      font(font: string): void;
      register(name: string, styles: Record<string, any> | string): void;
      select(name: string): void;
      default(styles: Record<string, any>): void;
    };
    location: {
      start: { cfi: string };
      end: { cfi: string };
    };
  }

  export interface Book {
    ready: Promise<void>;
    loaded: {
      navigation: Promise<Navigation>;
      metadata: Promise<any>;
    };
    navigation: Navigation;
    locations: {
      total?: number;
      length(): number;
      generate(chars?: number): Promise<string[]>;
      cfiFromPercentage(percentage: number): string;
      percentageFromCfi(cfi: string): number;
    };
    renderTo(element: HTMLElement | string, options?: RenditionOptions): Rendition;
    destroy(): void;
  }

  export default function ePub(urlOrData: string | ArrayBuffer, options?: any): Book;
}
