import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookFormat, BookStatus, BookSummaryDto } from '@bookflow/shared-types';
import { BookCard } from '../features/books/components/BookCard';

describe('BookCard', () => {
  const mockBook: BookSummaryDto = {
    id: 'book-1',
    ownerId: 'user-1',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt',
    format: BookFormat.EPUB,
    status: BookStatus.READING,
    hasCover: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastOpenedAt: null,
  };

  it('renders book title, author, format badge, and reading status', () => {
    const handleSelect = vi.fn();
    const handleDelete = vi.fn();

    render(<BookCard book={mockBook} onSelect={handleSelect} onDelete={handleDelete} />);

    expect(screen.getAllByText('The Pragmatic Programmer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Andrew Hunt').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('EPUB')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('triggers onSelect when clicked', () => {
    const handleSelect = vi.fn();
    const handleDelete = vi.fn();

    render(<BookCard book={mockBook} onSelect={handleSelect} onDelete={handleDelete} />);

    fireEvent.click(screen.getByText('Details →'));
    expect(handleSelect).toHaveBeenCalledWith(mockBook);
  });
});
