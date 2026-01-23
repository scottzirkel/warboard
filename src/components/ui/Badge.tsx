import { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';  // Kept for compatibility, styling is consistent
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  // Use CSS classes from globals.css for consistent iOS styling
  const variantClass = {
    default: 'bg-white/10 text-white/60',
    accent: 'badge-accent',
    success: 'badge-green',
    warning: 'bg-yellow-500/18 text-yellow-400',
    error: 'badge-red',
    info: 'badge-blue',
    purple: 'badge-purple',
  }[variant];

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
