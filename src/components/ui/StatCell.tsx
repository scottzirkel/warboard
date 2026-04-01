interface StatCellProps {
  label: string;
  value: string | number;
  modified?: boolean;
  tooltip?: string;
  className?: string;
}

export function StatCell({
  label,
  value,
  modified = false,
  tooltip,
  className = '',
}: StatCellProps) {
  return (
    <div
      className={`
        flex flex-col items-center p-2 rounded-lg bg-cm-stat-bg
        ${className}
      `}
      title={tooltip}
    >
      <div className="text-[10px] font-medium text-cm-text-muted uppercase tracking-[0.5px]">
        {label}
      </div>
      <div
        className={`
          text-lg font-semibold mt-0.5
          ${modified ? 'text-accent-400' : 'text-cm-text'}
        `}
      >
        {value}
      </div>
    </div>
  );
}

interface StatRowProps {
  children: React.ReactNode;
  className?: string;
}

export function StatRow({ children, className = '' }: StatRowProps) {
  return (
    <div className={`grid grid-cols-6 gap-2 ${className}`}>
      {children}
    </div>
  );
}
