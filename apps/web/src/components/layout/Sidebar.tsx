import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Library,
  Settings,
  LogIn,
  UserPlus,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';
import { useAuth } from '../../features/auth/hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const authNavItems = [
    { label: 'Library Catalog', path: '/', icon: Library },
    { label: 'Account Settings', path: '/profile', icon: Settings },
  ];

  const guestNavItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Sign In', path: '/login', icon: LogIn },
    { label: 'Create Account', path: '/register', icon: UserPlus },
  ];

  const navItems = isAuthenticated ? authNavItems : guestNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed sm:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-paper-200 dark:border-paper-800 bg-paper-50 dark:bg-paper-950 p-4 transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-paper-400">
                Navigation
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/' && location.pathname === '/library');

                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-xs'
                        : 'text-ink-700 hover:text-ink-900 hover:bg-paper-100 dark:text-paper-300 dark:hover:text-paper-100 dark:hover:bg-paper-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="space-y-1 pt-3 border-t border-paper-200 dark:border-paper-800">
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-paper-400">
                Resources
              </div>
              <a
                href="/#architecture"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-paper-100 dark:text-paper-300 dark:hover:text-paper-100 dark:hover:bg-paper-800 transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Architecture</span>
              </a>
              <a
                href="http://localhost:3000/api/docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-paper-100 dark:text-paper-300 dark:hover:text-paper-100 dark:hover:bg-paper-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4" />
                  <span>API Docs</span>
                </div>
              </a>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-brand-700 dark:text-brand-300">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>BookFlow Platform</span>
            </div>
            <div className="text-ink-600 dark:text-paper-400 mt-1 text-[11px] leading-relaxed">
              EPUB & PDF Reader • Annotations • Cloud Sync
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
