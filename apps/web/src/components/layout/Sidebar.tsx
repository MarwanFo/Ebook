import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Library, BookOpen, Settings, Layers } from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';

export const Sidebar: React.FC = () => {
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Library (Phase 3)', path: '#', icon: Library, disabled: true },
    { label: 'Reader (Phase 4-5)', path: '#', icon: BookOpen, disabled: true },
    { label: 'Architecture', path: '#architecture', icon: Layers },
    { label: 'Settings (Phase 6)', path: '#', icon: Settings, disabled: true },
  ];

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
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-paper-400">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-ink-400 dark:text-paper-600 cursor-not-allowed select-none"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                );
              }

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

          <div className="p-3 rounded-xl bg-paper-100 dark:bg-paper-900 border border-paper-200 dark:border-paper-800 text-xs">
            <div className="font-semibold text-ink-900 dark:text-paper-100">Phase 1 Active</div>
            <div className="text-ink-600 dark:text-paper-400 mt-0.5">
              Foundational Monorepo & Health Monitoring
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
