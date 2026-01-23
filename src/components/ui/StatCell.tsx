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
      className={`stat-cell ${className}`}
      title={tooltip}
    >
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${modified ? 'modified' : ''}`}>
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
    <div className={`flex gap-1 ${className}`}>
      {children}
    </div>
  );
}
