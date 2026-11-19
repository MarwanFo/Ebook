import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import { TurnstileWidget } from './TurnstileWidget';
import { Button } from '../../../components/common/Button';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  BookOpen,
  Shield,
  Library,
} from 'lucide-react';

export const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [botField, setBotField] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
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
        botField: botField || undefined,
        turnstileToken: turnstileToken || undefined,
      });

      navigate('/', { replace: true });
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Registration failed. Please check your details.',
      );
    }
  };

  return (
    <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 bg-surface animate-fade-in min-h-[calc(100vh-4rem)]">
      {/* Left Editorial Identity Column */}
      <div className="hidden lg:flex lg:col-span-5 bg-surface-muted/60 border-r border-border p-8 lg:p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-8 border border-primary/20">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Join the Community</span>
          </div>

          <blockquote className="space-y-3 mt-4">
            <p className="font-serif text-2xl lg:text-3xl text-text leading-relaxed italic">
              &ldquo;A reader lives a thousand lives before he dies... The man who never reads lives
              only one.&rdquo;
            </p>
            <footer className="text-xs font-semibold text-text-muted tracking-widest uppercase">
              — George R.R. Martin
            </footer>
          </blockquote>
        </div>

        <div className="space-y-4 pt-8 border-t border-border/60">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <Library className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Your personal ebook cloud library</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
            <span>End-to-end hardened authentication</span>
          </div>
        </div>
      </div>

      {/* Right Interactive Form Column */}
      <div className="p-8 sm:p-12 lg:p-16 col-span-1 lg:col-span-7 flex flex-col justify-center items-center bg-surface">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-text">
              Create an Account
            </h2>
            <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
              Join BookFlow to read, organize, and track your ebooks
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
              <label htmlFor="displayName" className="block text-xs font-semibold text-text mb-1.5">
                Display Name <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <User className="h-4 w-4 text-text-muted" />
                </div>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Avid Reader"
                />
              </div>
            </div>

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
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="reader@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-text mb-1.5">
                Passphrase
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-text-muted" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-10 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Enter at least 15 characters..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted hover:text-text transition-colors"
                  aria-label={showPassword ? 'Hide value' : 'Show value'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Passphrase guidance bar */}
              <div className="mt-3 space-y-2 p-3 rounded-xl bg-surface-muted/50 border border-border">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="font-semibold text-text">
                    {charCount > 0 ? strengthLabel : 'Minimum 15 characters'}
                  </span>
                  <span className="font-mono">{charCount} / 15+</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full transition-all duration-300 ${strengthColor} ${
                      charCount > 0 ? progressWidth : 'w-0'
                    }`}
                  />
                </div>
                <div className="flex items-center space-x-1.5 text-[11px] text-text-muted">
                  {isLengthSufficient ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-text-muted/40 flex-shrink-0" />
                  )}
                  <span>
                    Tip: Passphrases with spaces (e.g. <code>correct horse battery staple</code>) or
                    emojis are welcome!
                  </span>
                </div>
              </div>
            </div>

            {/* Invisible Honeypot Field (Bot Trap) */}
            <div
              className="opacity-0 absolute -z-50 pointer-events-none select-none h-0 w-0 overflow-hidden"
              aria-hidden="true"
              tabIndex={-1}
            >
              <label htmlFor="botField">Leave this field blank</label>
              <input
                id="botField"
                name="botField"
                type="text"
                value={botField}
                onChange={(e) => setBotField(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Cloudflare Turnstile Challenge (Renders when VITE_TURNSTILE_SITE_KEY is configured) */}
            <TurnstileWidget
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 text-sm font-semibold shadow-sm active:scale-[0.99] transition-all"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs sm:text-sm text-text-muted border-t border-border pt-4">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary hover:underline transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
