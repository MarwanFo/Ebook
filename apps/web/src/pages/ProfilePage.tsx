import React, { useState } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useLogout } from '../features/auth/hooks/useLogout';
import { ChangePasswordModal } from '../features/auth/components/ChangePasswordModal';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { KeyRound, LogOut, Mail, Shield, User, Sparkles } from 'lucide-react';

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

  const initials = (user.displayName || user.email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fade-in space-y-6">
      {/* Header Profile Masthead */}
      <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-serif text-2xl font-bold flex-shrink-0 shadow-inner">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-serif tracking-tight text-text">
                {user.displayName || 'Avid Reader'}
              </h1>
              <Badge variant="info">{user.role}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-text-muted mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">
                Account Details
              </h2>
            </div>

            <div className="mt-4 divide-y divide-border/60 text-xs">
              <div className="flex items-center justify-between py-3">
                <span className="text-text-muted">Display Name</span>
                <span className="font-semibold text-text">
                  {user.displayName || 'Not specified'}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-text-muted">Email Address</span>
                <span className="font-semibold text-text truncate max-w-[180px]">{user.email}</span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-text-muted">Account Tier</span>
                <span className="font-semibold text-text capitalize">
                  {user.role.toLowerCase()}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-text-muted">Member Since</span>
                <span className="font-semibold text-text">{formattedDate}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Full offline reading & dual reader engines enabled</span>
          </div>
        </div>

        {/* Security & Authentication Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">
                Security & Passphrase
              </h2>
            </div>

            <p className="mt-4 text-xs text-text-muted leading-relaxed">
              Your account is secured with Argon2id cryptographic hashing and rotating
              family-tracked JWT sessions.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-surface-muted/60 border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between text-text">
                <span className="font-medium">Password Authentication</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                We enforce a minimum of 15 Unicode characters to protect against offline brute force
                attacks.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-border flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsPasswordModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Change Password</span>
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
