import React from 'react';
import { ResetPasswordForm } from '../features/auth/components/ResetPasswordForm';

export const ResetPasswordPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-[calc(100vh-4rem)] items-center justify-center p-6 sm:p-12">
      <ResetPasswordForm />
    </div>
  );
};
