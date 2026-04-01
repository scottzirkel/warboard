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
    default: 'bg-cm-stat-bg text-cm-text-secondary',
    accent: 'bg-[color-mix(in_srgb,var(--accent-500)_16%,var(--cm-surface-card))] text-accent-700',
    success: 'bg-green-500/16 text-green-700',
    warning: 'bg-yellow-500/16 text-yellow-700',
    error: 'bg-red-500/16 text-red-700',
    info: 'bg-blue-500/16 text-blue-700',
    purple: 'bg-purple-500/16 text-purple-700',
  }[variant];

  return (
    <span className={`${base} ${variantStyles} ${className}`}>
      {children}
    </span>
  );
}
