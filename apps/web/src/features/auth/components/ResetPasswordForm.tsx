import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useResetPassword } from '../hooks/useResetPassword';
import { Button } from '../../../components/common/Button';
import { AlertCircle, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

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
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invalid Reset Link</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <div className="mt-6">
          <Link to="/forgot-password">
            <Button variant="primary">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Password Reset Complete</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Your password has been successfully updated and all prior sessions have been revoked.
        </p>
        <div className="mt-6">
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
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Set New Password
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Please enter your new secure passphrase (at least 15 characters).
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          className="mb-6 flex items-start space-x-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            New Passphrase
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              placeholder="Enter at least 15 characters..."
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>Minimum 15 characters</span>
            <span className={isLengthSufficient ? 'font-medium text-emerald-600' : ''}>
              {charCount} / 15+
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Confirm New Passphrase
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              placeholder="Re-enter your new passphrase..."
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full py-2.5 text-sm font-semibold"
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? 'Updating Password...' : 'Reset Password'}
        </Button>
      </form>
    </div>
  );
};
