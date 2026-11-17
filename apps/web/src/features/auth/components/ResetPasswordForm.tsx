import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useResetPassword } from '../hooks/useResetPassword';
import { Button } from '../../../components/common/Button';
import { AlertCircle, CheckCircle2, Lock, ArrowRight, KeyRound } from 'lucide-react';

export const ResetPasswordForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetMutation = useResetPassword();

  const charCount = [...password].length;
  const isLengthSufficient = charCount >= 15;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError('Invalid or missing password reset token. Please request a new link.');
      return;
    }

    if (charCount < 15) {
      setFormError('New password must be at least 15 Unicode characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      await resetMutation.mutateAsync({
        token,
        newPassword: password,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.',
      );
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-xl animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-text">Invalid Reset Link</h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <div className="mt-6 pt-4 border-t border-border">
          <Link to="/forgot-password">
            <Button variant="primary">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-xl animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-text">Password Reset Complete</h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          Your password has been successfully updated and all prior sessions have been revoked.
        </p>
        <div className="mt-6 pt-4 border-t border-border">
          <Link to="/login">
            <Button variant="primary" className="inline-flex items-center space-x-2">
              <span>Sign In with New Password</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl animate-fade-in">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
          <KeyRound className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold font-serif tracking-tight text-text">Set New Password</h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          Please enter your new secure passphrase (at least 15 characters).
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          className="mb-6 flex items-start space-x-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-text mb-1.5">
            New Passphrase
          </label>
          <div className="relative rounded-xl shadow-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-4 w-4 text-text-muted" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Enter at least 15 characters..."
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
            <span>Minimum 15 characters</span>
            <span className={isLengthSufficient ? 'font-medium text-emerald-600' : ''}>
              {charCount} / 15+
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-text mb-1.5">
            Confirm New Passphrase
          </label>
          <div className="relative rounded-xl shadow-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-4 w-4 text-text-muted" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Re-enter your new passphrase..."
            />
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-sm font-semibold shadow-sm active:scale-[0.99] transition-all"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? 'Updating Password...' : 'Reset Password'}
          </Button>
        </div>
      </form>
    </div>
  );
};
