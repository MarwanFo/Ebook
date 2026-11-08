import React from 'react';
import { LoginForm } from '../features/auth/components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center px-4 py-12">
      <LoginForm />
    </div>
  );
};

