import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const baseStyles = 'rounded-xl transition-all duration-200';

  const variantStyles = {
    default: 'bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 shadow-sm',
    elevated:
      'bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 shadow-book hover:shadow-book-lg',
    bordered: 'bg-transparent border-2 border-paper-200 dark:border-paper-800',
  };

  return (
    <div className={twMerge(clsx(baseStyles, variantStyles[variant], className))} {...props}>
      {children}
    </div>
  );
};
