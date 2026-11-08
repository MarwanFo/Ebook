import React from 'react';
import { ForgotPasswordForm } from '../features/auth/components/ForgotPasswordForm';

export const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center px-4 py-12">
      <ForgotPasswordForm />
    </div>
  );
};

