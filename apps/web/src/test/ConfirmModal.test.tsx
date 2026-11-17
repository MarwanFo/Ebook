import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from '../components/common/ConfirmModal';

describe('ConfirmModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmModal
        isOpen={false}
        title="Delete Book"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('Delete Book')).not.toBeInTheDocument();
  });

  it('renders title, message, and buttons when isOpen is true', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete from Library"
        message="Are you sure you want to delete this book?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Delete from Library')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this book?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete Book"
        message="Are you sure?"
        confirmLabel="Confirm Delete"
        onConfirm={handleConfirm}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel or close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete Book"
        message="Are you sure?"
        cancelLabel="Keep Book"
        onConfirm={vi.fn()}
        onClose={handleClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /keep book/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/close dialog/i));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete Book"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onClose={handleClose}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
