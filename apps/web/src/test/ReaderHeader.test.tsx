import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReaderHeader } from '../features/reading/components/ReaderHeader';

describe('ReaderHeader', () => {
  it('renders title, author, and chapter name', () => {
    render(
      <MemoryRouter>
        <ReaderHeader
          title="Moby Dick"
          author="Herman Melville"
          chapterTitle="Chapter 1: Loomings"
          theme="sepia"
          isTocOpen={false}
          onToggleToc={vi.fn()}
          isSettingsOpen={false}
          onToggleSettings={vi.fn()}
          isFullscreen={false}
          onToggleFullscreen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Moby Dick')).toBeInTheDocument();
    expect(screen.getByText('by Herman Melville')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1: Loomings')).toBeInTheDocument();
  });

  it('triggers onToggleToc, onToggleSettings, and onToggleFullscreen', () => {
    const handleToggleToc = vi.fn();
    const handleToggleSettings = vi.fn();
    const handleToggleFullscreen = vi.fn();

    render(
      <MemoryRouter>
        <ReaderHeader
          title="Moby Dick"
          theme="light"
          isTocOpen={false}
          onToggleToc={handleToggleToc}
          isSettingsOpen={false}
          onToggleSettings={handleToggleSettings}
          isFullscreen={false}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText('Table of Contents'));
    expect(handleToggleToc).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Display Settings'));
    expect(handleToggleSettings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Enter Fullscreen'));
    expect(handleToggleFullscreen).toHaveBeenCalledTimes(1);
  });
});
