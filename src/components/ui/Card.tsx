import { ReactNode } from 'react';

const cardDepthStyles = `
  bg-cm-surface-card
  rounded-2xl
  shadow-[var(--cm-shadow-card)]
`;

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
        ${depth ? cardDepthStyles : 'bg-cm-surface-hover-subtle rounded-xl'}
        ${selected ? 'ring-2 ring-inset ring-accent-500' : ''}
        ${hoverable ? 'hover:bg-cm-surface-hover cursor-pointer transition-colors' : ''}
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
    <div className={`px-4 py-3 border-b border-cm-border-subtle ${className}`}>
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
    <div className={`px-4 py-3 border-t border-cm-border-subtle ${className}`}>
      {children}
    </div>
  );
}
