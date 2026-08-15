import React from 'react';
import { Link } from 'react-router-dom';
import { BookX, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="p-4 rounded-2xl bg-paper-100 dark:bg-paper-800 border border-paper-200 dark:border-paper-700 text-brand-600 dark:text-brand-400">
        <BookX className="w-12 h-12" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink-900 dark:text-paper-50">
        Page Not Found
      </h1>
      <p className="text-sm text-ink-600 dark:text-paper-400 max-w-md">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link to="/">
        <Button variant="primary" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Button>
      </Link>
    </div>
  );
};
