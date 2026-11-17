import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChangePassword } from '../hooks/useChangePassword';
import { Button } from '../../../components/common/Button';
import { AlertCircle, Lock, X, KeyRound } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const changeMutation = useChangePassword();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !changeMutation.isPending) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, changeMutation.isPending]);

  if (!isOpen) return null;

  const charCount = [...newPassword].length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentPassword) {
      setFormError('Please enter your current password.');
      return;
    }

    if (charCount < 15) {
      setFormError('New passphrase must be at least 15 Unicode characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New passphrases do not match.');
      return;
    }

    try {
      await changeMutation.mutateAsync({
        currentPassword,
        newPassword,
      });

      onClose();
      navigate('/login', {
        replace: true,
        state: { message: 'Password changed successfully. Please sign in with your new password.' },
      });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to change password.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => !changeMutation.isPending && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={changeMutation.isPending}
          className="absolute right-4 top-4 text-text-muted hover:text-text hover:bg-surface-muted p-1.5 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 id="change-password-title" className="text-xl font-bold font-serif text-text">
              Change Password
            </h3>
            <p className="text-xs text-text-muted">
              Changing your password will revoke all other active sessions.
            </p>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="my-4 flex items-start space-x-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-xs font-semibold text-text mb-1.5"
            >
              Current Password
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Lock className="h-4 w-4 text-text-muted" />
              </div>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-xs font-semibold text-text mb-1.5">
              New Passphrase
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Lock className="h-4 w-4 text-text-muted" />
              </div>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="At least 15 characters..."
              />
            </div>
            <p className="mt-1 text-xs text-text-muted">Length: {charCount} / 15+ characters</p>
          </div>

          <div>
            <label
              htmlFor="confirmNewPassword"
              className="block text-xs font-semibold text-text mb-1.5"
            >
              Confirm New Passphrase
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Lock className="h-4 w-4 text-text-muted" />
              </div>
              <input
                id="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={changeMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={changeMutation.isPending}>
              {changeMutation.isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
