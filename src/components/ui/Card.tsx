import { ReactNode } from 'react';

const cardDepthStyles = `
  bg-[rgba(44,44,46,0.65)]
  rounded-2xl
  shadow-[0_0_0_0.5px_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.15),0_8px_24px_rgba(0,0,0,0.1)]
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
        ${depth ? cardDepthStyles : 'bg-white/5 rounded-xl'}
        ${selected ? 'ring-2 ring-inset ring-accent-500' : ''}
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
