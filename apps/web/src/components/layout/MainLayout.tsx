import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-paper-50 dark:bg-paper-950 transition-colors">
      <Header />
      <div className="flex-1 w-full flex">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
