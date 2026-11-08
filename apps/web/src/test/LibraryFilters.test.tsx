import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookFormat } from '@bookflow/shared-types';
import { LibraryFilters } from '../features/books/components/LibraryFilters';

describe('LibraryFilters', () => {
  it('renders search input and format filters, triggering callbacks on interaction', () => {
    const handleFilterChange = vi.fn();
    const handleUploadClick = vi.fn();

    render(
      <LibraryFilters
        filters={{ page: 1, limit: 10, search: '' }}
        onFilterChange={handleFilterChange}
        onUploadClick={handleUploadClick}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/search your library/i);
    fireEvent.change(searchInput, { target: { value: 'Rust' } });
    expect(handleFilterChange).toHaveBeenCalledWith({ search: 'Rust', page: 1 });

    const epubTab = screen.getByRole('button', { name: 'EPUB' });
    fireEvent.click(epubTab);
    expect(handleFilterChange).toHaveBeenCalledWith({ format: BookFormat.EPUB, page: 1 });

    const uploadBtn = screen.getByRole('button', { name: /upload book/i });
    fireEvent.click(uploadBtn);
    expect(handleUploadClick).toHaveBeenCalled();
  });
});
