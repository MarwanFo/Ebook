import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NavItem } from 'epubjs';
import { ReaderTocSidebar } from '../features/reading/components/ReaderTocSidebar';

describe('ReaderTocSidebar', () => {
  const mockToc: NavItem[] = [
    {
      id: 'c1',
      label: 'Introduction',
      href: 'text/intro.xhtml',
    },
    {
      id: 'c2',
      label: 'Chapter 1: The Beginning',
      href: 'text/ch1.xhtml',
      subitems: [
        {
          id: 'c2-1',
          label: 'Section 1.1: Foundations',
          href: 'text/ch1.xhtml#sec1',
        },
      ],
    },
  ];

  it('renders TOC items with nested hierarchy', () => {
    render(
      <ReaderTocSidebar
        isOpen={true}
        onClose={vi.fn()}
        toc={mockToc}
        onSelectChapter={vi.fn()}
        theme="sepia"
      />,
    );

    expect(screen.getByText('Table of Contents')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1: The Beginning')).toBeInTheDocument();
    expect(screen.getByText('Section 1.1: Foundations')).toBeInTheDocument();
  });

  it('triggers onSelectChapter and onClose when item is clicked', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <ReaderTocSidebar
        isOpen={true}
        onClose={handleClose}
        toc={mockToc}
        onSelectChapter={handleSelect}
        theme="light"
      />,
    );

    fireEvent.click(screen.getByText('Introduction'));
    expect(handleSelect).toHaveBeenCalledWith('text/intro.xhtml');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
