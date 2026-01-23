import { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
  headerRight?: ReactNode;
}

export function Panel({
  children,
  title,
  className = '',
  headerRight,
}: PanelProps) {
  return (
    <div
      className={`
        bg-gray-800/30 border border-gray-700/30 rounded-lg
        flex flex-col h-full
        ${className}
      `}
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-700/30 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

interface PanelSectionProps {
  children: ReactNode;
  title?: string;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function PanelSection({
  children,
  title,
  className = '',
}: PanelSectionProps) {
  return (
    <div className={`p-4 ${className}`}>
      {title && (
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
