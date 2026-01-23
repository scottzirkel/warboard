import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  // Base iOS button styles
  const baseClass = 'btn-ios touch-highlight';

  // Variant styles using CSS classes from globals.css
  const variantClass = {
    primary: 'btn-ios-primary',
    secondary: 'btn-ios-secondary',
    tinted: 'btn-ios-tinted',
    ghost: 'bg-transparent hover:bg-white/5 text-white/60 hover:text-white/80',
    danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  }[variant];

  // Size styles
  const sizeClass = {
    sm: 'btn-ios-sm',
    md: '',
    lg: 'min-h-[50px] px-6 text-base',
    icon: 'min-h-[36px] w-9 p-0',
  }[size];

  return (
    <button
      className={`
        ${baseClass}
        ${variantClass}
        ${sizeClass}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
