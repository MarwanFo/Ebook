import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { Button } from '../../../components/common/Button';
import { AlertCircle, CheckCircle2, Mail, ArrowLeft, KeyRound } from 'lucide-react';

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const forgotMutation = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }

    try {
      await forgotMutation.mutateAsync({ email: trimmedEmail });
      setIsSubmitted(true);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to process your request. Please try again.',
      );
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-xl animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-text">Check Your Email</h2>
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          If an account exists for <span className="font-semibold text-text">{email}</span>, you
          will receive password reset instructions shortly.
        </p>
        <p className="mt-2 text-xs text-text-muted/80">
          Be sure to check your spam or junk folder if the message does not appear in a few minutes.
        </p>
        <div className="mt-6 pt-4 border-t border-border">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-semibold text-primary hover:underline transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Sign In
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
        <h2 className="text-2xl font-bold font-serif tracking-tight text-text">
          Reset Your Password
        </h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          Enter your email address and we will send you a secure link to reset your password.
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
          <label htmlFor="email" className="block text-xs font-semibold text-text mb-1.5">
            Email Address
          </label>
          <div className="relative rounded-xl shadow-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Mail className="h-4 w-4 text-text-muted" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="reader@example.com"
            />
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-sm font-semibold shadow-sm active:scale-[0.99] transition-all"
            disabled={forgotMutation.isPending}
          >
            {forgotMutation.isPending ? 'Sending Link...' : 'Send Reset Link'}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center border-t border-border pt-4">
        <Link
          to="/login"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-primary hover:underline transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};
