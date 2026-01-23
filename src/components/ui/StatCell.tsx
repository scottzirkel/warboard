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
        text-center px-2 py-1
        ${className}
      `}
      title={tooltip}
    >
      <div className="text-xs text-gray-500 uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`
          text-sm font-semibold
          ${modified ? 'text-accent-400 cursor-help' : 'text-gray-200'}
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
    <div
      className={`
        flex items-center divide-x divide-gray-700/50
        bg-gray-800/30 rounded border border-gray-700/30
        ${className}
      `}
    >
      {children}
    </div>
  );
}
