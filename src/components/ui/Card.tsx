import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  hoverable?: boolean;
  depth?: boolean;
}

export function Card({
  children,
  className = '',
  onClick,
  selected = false,
  hoverable = false,
  depth = true,
}: CardProps) {
  return (
    <div
      className={`
        ${depth ? 'card-depth' : 'bg-white/5 rounded-xl'}
        ${selected ? 'ring-2 ring-accent-500' : ''}
        ${hoverable ? 'hover:bg-white/10 cursor-pointer transition-colors' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-4 py-3 border-b border-white/5 ${className}`}>
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-4 py-3 border-t border-white/5 ${className}`}>
      {children}
    </div>
  );
}
