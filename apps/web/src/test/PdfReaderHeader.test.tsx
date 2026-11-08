import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePdfStore } from '../features/reading/stores/pdf-store';
import { PdfReaderHeader } from '../features/reading/components/PdfReaderHeader';

describe('PdfReaderHeader', () => {
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

  it('renders title, author, and current page counter', () => {
    render(
      <MemoryRouter>
        <PdfReaderHeader
          title="Clean Architecture"
          author="Robert C. Martin"
          currentPage={14}
          totalPages={320}
          onJumpToPage={vi.fn()}
          isTocOpen={false}
          onToggleToc={vi.fn()}
          isThumbnailsOpen={false}
          onToggleThumbnails={vi.fn()}
          isFullscreen={false}
          onToggleFullscreen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Clean Architecture')).toBeInTheDocument();
    expect(screen.getByText('by Robert C. Martin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('14')).toBeInTheDocument();
    expect(screen.getByText('/ 320')).toBeInTheDocument();
  });

  it('triggers onJumpToPage when user enters page and submits', () => {
    const handleJump = vi.fn();

    render(
      <MemoryRouter>
        <PdfReaderHeader
          title="Clean Architecture"
          currentPage={1}
          totalPages={100}
          onJumpToPage={handleJump}
          isTocOpen={false}
          onToggleToc={vi.fn()}
          isThumbnailsOpen={false}
          onToggleThumbnails={vi.fn()}
          isFullscreen={false}
          onToggleFullscreen={vi.fn()}
        />
      </MemoryRouter>,
    );

    const input = screen.getByDisplayValue('1');
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.submit(input);

    expect(handleJump).toHaveBeenCalledWith(42);
  });

  it('toggles outline, thumbnails, and fullscreen actions', () => {
    const handleToggleToc = vi.fn();
    const handleToggleThumbnails = vi.fn();
    const handleToggleFullscreen = vi.fn();

    render(
      <MemoryRouter>
        <PdfReaderHeader
          title="Clean Architecture"
          currentPage={1}
          totalPages={100}
          onJumpToPage={vi.fn()}
          isTocOpen={false}
          onToggleToc={handleToggleToc}
          isThumbnailsOpen={false}
          onToggleThumbnails={handleToggleThumbnails}
          isFullscreen={false}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText('Document Outline'));
    expect(handleToggleToc).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Page Thumbnails'));
    expect(handleToggleThumbnails).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Enter Fullscreen'));
    expect(handleToggleFullscreen).toHaveBeenCalledTimes(1);
  });

  it('triggers onToggleBookmarks and shows count badge in PDF reader header', () => {
    const handleToggleBookmarks = vi.fn();

    render(
      <MemoryRouter>
        <PdfReaderHeader
          title="Clean Architecture"
          currentPage={1}
          totalPages={100}
          onJumpToPage={vi.fn()}
          isTocOpen={false}
          onToggleToc={vi.fn()}
          isThumbnailsOpen={false}
          onToggleThumbnails={vi.fn()}
          isBookmarksOpen={false}
          onToggleBookmarks={handleToggleBookmarks}
          bookmarkCount={3}
          isFullscreen={false}
          onToggleFullscreen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Bookmarks and Notes'));
    expect(handleToggleBookmarks).toHaveBeenCalledTimes(1);
  });
});
