import React from 'react';
import { RegisterForm } from '../features/auth/components/RegisterForm';

export const RegisterPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-[calc(100vh-4rem)]">
      <RegisterForm />
    </div>
  );
};
