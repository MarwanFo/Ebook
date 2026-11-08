import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  PdfReaderTocSidebar,
  PdfOutlineItem,
} from '../features/reading/components/PdfReaderTocSidebar';

describe('PdfReaderTocSidebar', () => {
  const mockOutline: PdfOutlineItem[] = [
    {
      title: 'Preface',
      pageNumber: 5,
    },
    {
      title: 'Part I: Introduction',
      pageNumber: 12,
      items: [
        {
          title: 'Chapter 1: What is Architecture?',
          pageNumber: 15,
        },
      ],
    },
  ];

  it('renders outline titles and page numbers', () => {
    render(
      <PdfReaderTocSidebar
        isOpen={true}
        onClose={vi.fn()}
        outline={mockOutline}
        currentPage={15}
        onSelectPage={vi.fn()}
        theme="sepia"
      />,
    );

    expect(screen.getByText('Document Outline')).toBeInTheDocument();
    expect(screen.getByText('Preface')).toBeInTheDocument();
    expect(screen.getByText('p. 5')).toBeInTheDocument();
    expect(screen.getByText('Part I: Introduction')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1: What is Architecture?')).toBeInTheDocument();
    expect(screen.getByText('p. 15')).toBeInTheDocument();
  });

  it('triggers onSelectPage and onClose when outline item clicked', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <PdfReaderTocSidebar
        isOpen={true}
        onClose={handleClose}
        outline={mockOutline}
        currentPage={1}
        onSelectPage={handleSelect}
        theme="light"
      />,
    );

    fireEvent.click(screen.getByText('Preface'));
    expect(handleSelect).toHaveBeenCalledWith(5);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
