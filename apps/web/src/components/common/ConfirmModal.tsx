import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => !isLoading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden p-6 relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-text-muted hover:text-text hover:bg-surface-muted p-1.5 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header */}
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${
            isDanger
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              : 'bg-primary/10 text-primary border-primary/20'
          }`}
        >
          {isDanger ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>

        {/* Title & Message */}
        <h3 id="confirm-modal-title" className="text-lg font-bold font-serif text-text mb-2">
          {title}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed mb-6">{message}</p>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-border bg-surface-muted text-text text-xs sm:text-sm font-medium hover:bg-border/60 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-primary hover:bg-primary-hover text-primary-contrast'
            }`}
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isDanger ? (
              <Trash2 className="w-4 h-4" />
            ) : null}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
