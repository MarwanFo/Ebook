import React, { useState } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useLogout } from '../features/auth/hooks/useLogout';
import { ChangePasswordModal } from '../features/auth/components/ChangePasswordModal';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { KeyRound, LogOut, Mail, Shield, User } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  if (!user) return null;

  const formattedDate = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your personal profile, credentials, and session security
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Details Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Profile Information
          </h2>
          <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
            <div className="flex items-center justify-between py-3">
              <span className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <User className="mr-2 h-4 w-4" />
                Display Name
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {user.displayName || 'Not specified'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <Mail className="mr-2 h-4 w-4" />
                Email Address
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <Shield className="mr-2 h-4 w-4" />
                Account Role
              </span>
              <Badge variant="info">{user.role}</Badge>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Member Since
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Security & Authentication Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Security & Authentication
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Update your passphrase or sign out of your account
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setIsPasswordModalOpen(true)}
              className="inline-flex items-center space-x-2"
            >
              <KeyRound className="h-4 w-4" />
              <span>Change Password</span>
            </Button>

            <Button
              variant="danger"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="inline-flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>{logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}</span>
            </Button>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
