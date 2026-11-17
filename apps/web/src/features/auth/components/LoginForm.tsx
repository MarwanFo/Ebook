import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { Button } from '../../../components/common/Button';
import { AlertCircle, Lock, Mail, Eye, EyeOff, BookOpen, Sparkles, Compass } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useLogin();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: trimmedEmail,
        password,
      });

      const from =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Invalid email address or password.');
    }
  };

  return (
    <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 bg-surface animate-fade-in min-h-[calc(100vh-4rem)]">
      {/* Left Editorial Identity Column */}
      <div className="hidden lg:flex lg:col-span-5 bg-surface-muted/60 border-r border-border p-8 lg:p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Subtle Decorative Background Ornament */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-8 border border-primary/20">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Digital Reading Sanctuary</span>
          </div>

          <blockquote className="space-y-3 mt-4">
            <p className="font-serif text-2xl lg:text-3xl text-text leading-relaxed italic">
              &ldquo;I have always imagined that Paradise will be a kind of library.&rdquo;
            </p>
            <footer className="text-xs font-semibold text-text-muted tracking-widest uppercase">
              — Jorge Luis Borges
            </footer>
          </blockquote>
        </div>

        <div className="space-y-4 pt-8 border-t border-border/60">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Dual-engine physical EPUB & PDF viewer</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <Compass className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Synchronized progress & bookmarks</span>
          </div>
        </div>
      </div>

      {/* Right Interactive Form Column */}
      <div className="p-8 sm:p-12 lg:p-16 col-span-1 lg:col-span-7 flex flex-col justify-center items-center bg-surface">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-text">
              Sign In to BookFlow
            </h2>
            <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
              Enter your credentials to access your reading library
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-text">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-text-muted" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-10 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="••••••••••••••••"
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
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 text-sm font-semibold shadow-sm active:scale-[0.99] transition-all"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs sm:text-sm text-text-muted border-t border-border pt-4">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary hover:underline transition-colors"
            >
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
