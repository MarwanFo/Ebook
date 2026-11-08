import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReaderFooter } from '../features/reading/components/ReaderFooter';

describe('ReaderFooter', () => {
  it('renders percentage and page indicators', () => {
    render(
      <ReaderFooter
        percentage={45.8}
        currentPage={12}
        totalPages={120}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        theme="sepia"
      />,
    );

    expect(screen.getByText('46%')).toBeInTheDocument();
    expect(screen.getByText('(12/120)')).toBeInTheDocument();
  });

  it('triggers onPrev and onNext callbacks', () => {
    const handlePrev = vi.fn();
    const handleNext = vi.fn();

    render(<ReaderFooter percentage={10} onPrev={handlePrev} onNext={handleNext} theme="light" />);

    fireEvent.click(screen.getByLabelText('Previous Page'));
    expect(handlePrev).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Next Page'));
    expect(handleNext).toHaveBeenCalledTimes(1);
  });
});
