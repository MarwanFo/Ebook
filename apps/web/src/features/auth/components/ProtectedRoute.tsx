import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../components/common/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isNetworkError, retryBootstrap } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="flex min-h-[400px] flex-col items-center justify-center space-y-4"
        role="status"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Verifying session...</p>
      </div>
    );
  }

  if (isNetworkError) {
    return (
      <div className="mx-auto my-12 max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-red-950/30">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Connection Issue
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Unable to connect to the authentication server. Your session is preserved.
        </p>
        <div className="mt-5">
          <Button
            onClick={retryBootstrap}
            variant="primary"
            className="inline-flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Connection</span>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
