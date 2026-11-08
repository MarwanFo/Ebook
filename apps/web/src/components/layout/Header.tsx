import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Moon, Sun, Coffee, Menu, X, User, LogOut } from 'lucide-react';
import { ReaderTheme } from '@bookflow/shared-types';
import { useUIStore } from '../../stores/ui-store';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useLogout } from '../../features/auth/hooks/useLogout';

export const Header: React.FC = () => {
  const { theme, setTheme, isSidebarOpen, toggleSidebar } = useUIStore();
  const { user, isAuthenticated } = useAuth();
  const logoutMutation = useLogout();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-paper-200 dark:border-paper-800 bg-paper-50/90 dark:bg-paper-950/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg text-ink-600 hover:text-ink-900 hover:bg-paper-200 dark:text-paper-400 dark:hover:text-paper-100 dark:hover:bg-paper-800 sm:hidden transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-sm group-hover:bg-brand-600 transition-all group-hover:scale-105">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold font-serif text-ink-900 dark:text-paper-50 tracking-tight">
                BookFlow
              </span>
              <span className="text-[10px] uppercase font-semibold text-brand-600 dark:text-brand-400 tracking-widest -mt-1">
                Reader
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            to="/"
            className="px-3 py-2 rounded-lg text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-paper-100 dark:text-paper-300 dark:hover:text-paper-100 dark:hover:bg-paper-800 transition-colors"
          >
            Overview
          </Link>
          <a
            href="http://localhost:3000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-paper-100 dark:text-paper-300 dark:hover:text-paper-100 dark:hover:bg-paper-800 transition-colors"
          >
            API Docs
          </a>
        </nav>

        {/* Auth State & Theme Switcher */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:text-ink-900 hover:bg-paper-100 dark:text-paper-200 dark:hover:bg-paper-800 transition-colors border border-paper-200 dark:border-paper-700"
              >
                <User className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{user.displayName || user.email}</span>
              </Link>
              <button
                onClick={() => logoutMutation.mutate()}
                title="Sign Out"
                disabled={logoutMutation.isPending}
                className="p-1.5 rounded-lg text-ink-600 hover:text-red-600 hover:bg-red-50 dark:text-paper-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 hover:bg-brand-600 text-white shadow-xs transition-colors"
              >
                Register
              </Link>
            </div>
          )}

          {/* Theme Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-paper-200/80 dark:bg-paper-800/80 border border-paper-300 dark:border-paper-700">
            <button
              onClick={() => setTheme(ReaderTheme.LIGHT)}
              title="Warm Light Theme"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === ReaderTheme.LIGHT
                  ? 'bg-white text-brand-600 shadow-xs'
                  : 'text-ink-600 hover:text-ink-900 dark:text-paper-400'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme(ReaderTheme.SEPIA)}
              title="Sepia Paper Theme"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === ReaderTheme.SEPIA
                  ? 'bg-sepia-surface text-sepia-text shadow-xs'
                  : 'text-ink-600 hover:text-ink-900 dark:text-paper-400'
              }`}
            >
              <Coffee className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme(ReaderTheme.DARK)}
              title="Dark Charcoal Theme"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === ReaderTheme.DARK
                  ? 'bg-paper-900 text-brand-400 shadow-xs'
                  : 'text-ink-600 hover:text-ink-900 dark:text-paper-400'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
