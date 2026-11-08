import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PdfReaderFooter } from '../features/reading/components/PdfReaderFooter';

describe('PdfReaderFooter', () => {
  it('renders page counter and percentage', () => {
    render(
      <PdfReaderFooter
        currentPage={25}
        totalPages={100}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onSeekPage={vi.fn()}
        theme="sepia"
      />,
    );

    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('(p. 25/100)')).toBeInTheDocument();
  });

  it('triggers onPrev and onNext callbacks', () => {
    const handlePrev = vi.fn();
    const handleNext = vi.fn();

    render(
      <PdfReaderFooter
        currentPage={10}
        totalPages={50}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeekPage={vi.fn()}
        theme="light"
      />,
    );

    fireEvent.click(screen.getByLabelText('Previous Page'));
    expect(handlePrev).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Next Page'));
    expect(handleNext).toHaveBeenCalledTimes(1);
  });
});
