import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useReaderStore } from '../features/reading/stores/reader-store';
import { ReaderSettingsModal } from '../features/reading/components/ReaderSettingsModal';

describe('ReaderSettingsModal', () => {
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

  it('renders theme palettes, font choices, and layout modes', () => {
    render(<ReaderSettingsModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Reader Appearance')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Sepia')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Serif')).toBeInTheDocument();
    expect(screen.getByText('Adaptive')).toBeInTheDocument();
    expect(screen.getByText('Two Pages')).toBeInTheDocument();
    expect(screen.getByText('Single Page')).toBeInTheDocument();
  });

  it('updates theme in store when palette clicked', () => {
    render(<ReaderSettingsModal isOpen={true} onClose={() => {}} />);

    fireEvent.click(screen.getByText('Dark'));
    expect(useReaderStore.getState().theme).toBe('dark');
  });

  it('updates font size when A+ and A- buttons are clicked', () => {
    render(<ReaderSettingsModal isOpen={true} onClose={() => {}} />);

    expect(useReaderStore.getState().fontSize).toBe(18);

    fireEvent.click(screen.getByTitle('Increase font size'));
    expect(useReaderStore.getState().fontSize).toBe(20);

    fireEvent.click(screen.getByTitle('Decrease font size'));
    expect(useReaderStore.getState().fontSize).toBe(18);
  });

  it('updates page layout mode', () => {
    render(<ReaderSettingsModal isOpen={true} onClose={() => {}} />);

    fireEvent.click(screen.getByText('Two Pages'));
    expect(useReaderStore.getState().layout).toBe('two-page');

    fireEvent.click(screen.getByText('Single Page'));
    expect(useReaderStore.getState().layout).toBe('single-page');
  });
});
