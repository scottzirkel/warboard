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

  const base = `
    inline-flex items-center justify-center gap-1.5
    font-semibold transition-all
    active:scale-[0.97] active:opacity-80
    [-webkit-tap-highlight-color:transparent]
  `;

  const variantStyles = {
    primary: 'bg-gradient-to-b from-accent-500 to-accent-600 text-gray-900',
    secondary: 'bg-[rgba(118,118,128,0.24)] text-white',
    tinted: 'bg-[color-mix(in_srgb,var(--accent-500)_18%,transparent)] text-accent-400',
    ghost: 'bg-transparent hover:bg-white/5 text-white/60 hover:text-white/80',
    danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  }[variant];

  const sizeStyles = {
    sm: 'min-h-[36px] px-3 text-[13px] rounded-[9px]',
    md: 'min-h-[44px] px-4 text-[15px] rounded-[10px]',
    lg: 'min-h-[50px] px-6 text-base rounded-xl',
    icon: 'min-h-[36px] w-9 p-0 rounded-[9px]',
  }[size];

  return (
    <button
      className={`
        ${base}
        ${variantStyles}
        ${sizeStyles}
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
