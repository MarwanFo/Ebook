import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import { Button } from '../../../components/common/Button';
import { AlertCircle, CheckCircle2, Lock, Mail, User } from 'lucide-react';

export const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const registerMutation = useRegister();
  const navigate = useNavigate();

  // Unicode code points count
  const charCount = [...password].length;
  const isLengthSufficient = charCount >= 15;
  const hasSpacesOrWords = password.includes(' ') || charCount >= 20;

  // Guidance strength score
  let strengthLabel = 'Too short';
  let strengthColor = 'bg-red-500';
  let progressWidth = 'w-1/4';

  if (charCount >= 15 && hasSpacesOrWords) {
    strengthLabel = 'Strong passphrase';
    strengthColor = 'bg-emerald-500';
    progressWidth = 'w-full';
  } else if (charCount >= 15) {
    strengthLabel = 'Adequate length';
    strengthColor = 'bg-yellow-500';
    progressWidth = 'w-3/4';
  } else if (charCount >= 8) {
    strengthLabel = `${15 - charCount} more characters needed`;
    strengthColor = 'bg-orange-500';
    progressWidth = 'w-1/2';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }

    if (charCount < 15) {
      setFormError('Password must be at least 15 Unicode characters long.');
      return;
    }

    try {
      await registerMutation.mutateAsync({
        email: trimmedEmail,
        password,
        displayName: displayName.trim() || undefined,
      });

      navigate('/', { replace: true });
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Registration failed. Please check your details.',
      );
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Create an Account
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Join BookFlow to read, organize, and track your ebooks
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
            htmlFor="displayName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Display Name <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              placeholder="Avid Reader"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email Address
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              placeholder="reader@example.com"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Passphrase
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

          {/* Passphrase guidance bar */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">
                {charCount > 0 ? strengthLabel : 'Minimum 15 characters'}
              </span>
              <span>{charCount} / 15+</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full transition-all duration-300 ${strengthColor} ${
                  charCount > 0 ? progressWidth : 'w-0'
                }`}
              />
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400">
              {isLengthSufficient ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-gray-400" />
              )}
              <span>
                Tip: Passphrases with spaces (e.g. <code>correct horse battery staple</code>) or
                emojis are welcome!
              </span>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full py-2.5 text-sm font-semibold"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};
