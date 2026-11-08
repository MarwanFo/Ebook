import React from 'react';
import { ResetPasswordForm } from '../features/auth/components/ResetPasswordForm';

export const ResetPasswordPage: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center px-4 py-12">
      <ResetPasswordForm />
    </div>
  );
};
