import { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size: _size,
  className = '',
}: BadgeProps) {
  const base = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold';

  const variantStyles = {
    default: 'bg-white/10 text-white/60',
    accent: 'bg-[color-mix(in_srgb,var(--accent-500)_18%,transparent)] text-accent-400',
    success: 'bg-green-500/18 text-green-400',
    warning: 'bg-yellow-500/18 text-yellow-400',
    error: 'bg-red-500/18 text-red-400',
    info: 'bg-blue-500/18 text-blue-400',
    purple: 'bg-purple-500/18 text-purple-400',
  }[variant];

  return (
    <span className={`${base} ${variantStyles} ${className}`}>
      {children}
    </span>
  );
}
