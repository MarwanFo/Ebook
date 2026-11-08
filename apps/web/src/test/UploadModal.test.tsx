import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { UploadModal } from '../features/books/components/UploadModal';

describe('UploadModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const renderModal = (isOpen: boolean, onClose = vi.fn(), onSuccess = vi.fn()) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UploadModal isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} />
      </QueryClientProvider>,
    );
  };

  it('does not render when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByText(/upload ebook to library/i)).not.toBeInTheDocument();
  });

  it('renders modal dialog when isOpen is true', () => {
    renderModal(true);
    expect(screen.getByText(/upload ebook to library/i)).toBeInTheDocument();
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });

  it('calls onClose when close or cancel button is clicked', () => {
    const handleClose = vi.fn();
    renderModal(true, handleClose);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});
