import { beforeEach, describe, expect, it } from 'vitest';
import { useReaderStore } from '../features/reading/stores/reader-store';

describe('useReaderStore', () => {
  beforeEach(() => {
    try {
      window.localStorage?.clear();
    } catch {
      // Ignore if localStorage unavailable
    }
    useReaderStore.setState({
      fontSize: 18,
      fontFamily: 'serif',
      lineHeight: 1.6,
      theme: 'sepia',
      layout: 'auto',
    });
  });

  it('initializes with default preferences', () => {
    const state = useReaderStore.getState();
    expect(state.fontSize).toBe(18);
    expect(state.fontFamily).toBe('serif');
    expect(state.lineHeight).toBe(1.6);
    expect(state.theme).toBe('sepia');
    expect(state.layout).toBe('auto');
  });

  it('updates font size and persists to localStorage', () => {
    useReaderStore.getState().setFontSize(22);
    expect(useReaderStore.getState().fontSize).toBe(22);

    const stored = JSON.parse(window.localStorage?.getItem('bookflow_reader_settings') || '{}');
    expect(stored.fontSize).toBe(22);
  });

  it('updates theme palette and persists', () => {
    useReaderStore.getState().setTheme('dark');
    expect(useReaderStore.getState().theme).toBe('dark');

    const stored = JSON.parse(window.localStorage?.getItem('bookflow_reader_settings') || '{}');
    expect(stored.theme).toBe('dark');
  });

  it('updates layout mode and persists', () => {
    useReaderStore.getState().setLayout('two-page');
    expect(useReaderStore.getState().layout).toBe('two-page');

    const stored = JSON.parse(window.localStorage?.getItem('bookflow_reader_settings') || '{}');
    expect(stored.layout).toBe('two-page');
  });

  it('updates line height and persists', () => {
    useReaderStore.getState().setLineHeight(1.8);
    expect(useReaderStore.getState().lineHeight).toBe(1.8);

    const stored = JSON.parse(window.localStorage?.getItem('bookflow_reader_settings') || '{}');
    expect(stored.lineHeight).toBe(1.8);
  });
});
