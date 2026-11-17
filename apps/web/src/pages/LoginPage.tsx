import React from 'react';
import { LoginForm } from '../features/auth/components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-[calc(100vh-4rem)]">
      <LoginForm />
    </div>
  );
};
