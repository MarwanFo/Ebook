import { beforeEach, describe, expect, it } from 'vitest';
import { usePdfStore } from '../features/reading/stores/pdf-store';

describe('usePdfStore', () => {
  beforeEach(() => {
    try {
      window.localStorage?.clear();
    } catch {
      // Ignore if localStorage unavailable
    }
    usePdfStore.setState({
      zoom: 1.0,
      zoomMode: 'fit-width',
      viewMode: 'two-page',
      theme: 'sepia',
      rotation: 0,
    });
  });

  it('initializes with default PDF reading settings', () => {
    const state = usePdfStore.getState();
    expect(state.zoom).toBe(1.0);
    expect(state.zoomMode).toBe('fit-width');
    expect(state.viewMode).toBe('two-page');
    expect(state.theme).toBe('sepia');
    expect(state.rotation).toBe(0);
  });

  it('increments and decrements zoom level within clamp bounds', () => {
    usePdfStore.getState().zoomIn();
    expect(usePdfStore.getState().zoom).toBe(1.2);
    expect(usePdfStore.getState().zoomMode).toBe('custom');

    usePdfStore.getState().zoomOut();
    expect(usePdfStore.getState().zoom).toBe(1.0);

    // Clamps to minimum 0.4
    usePdfStore.getState().setZoom(0.1);
    expect(usePdfStore.getState().zoom).toBe(0.4);

    // Clamps to maximum 2.5
    usePdfStore.getState().setZoom(5.0);
    expect(usePdfStore.getState().zoom).toBe(2.5);
  });

  it('rotates document clockwise in 90-degree steps', () => {
    usePdfStore.getState().rotateClockwise();
    expect(usePdfStore.getState().rotation).toBe(90);

    usePdfStore.getState().rotateClockwise();
    expect(usePdfStore.getState().rotation).toBe(180);

    usePdfStore.getState().rotateClockwise();
    expect(usePdfStore.getState().rotation).toBe(270);

    usePdfStore.getState().rotateClockwise();
    expect(usePdfStore.getState().rotation).toBe(0);
  });

  it('updates view mode (two-page, single-page, continuous)', () => {
    usePdfStore.getState().setViewMode('continuous');
    expect(usePdfStore.getState().viewMode).toBe('continuous');

    usePdfStore.getState().setViewMode('single-page');
    expect(usePdfStore.getState().viewMode).toBe('single-page');
  });

  it('persists preferences to localStorage', () => {
    usePdfStore.getState().setTheme('dark');
    expect(usePdfStore.getState().theme).toBe('dark');

    const stored = JSON.parse(window.localStorage?.getItem('bookflow_pdf_settings') || '{}');
    expect(stored.theme).toBe('dark');
  });
});
