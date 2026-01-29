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
        flex flex-col items-center p-2 rounded-lg bg-black/20
        ${className}
      `}
      title={tooltip}
    >
      <div className="text-[10px] font-medium text-white/45 uppercase tracking-[0.5px]">
        {label}
      </div>
      <div
        className={`
          text-lg font-semibold mt-0.5
          ${modified ? 'text-accent-400' : 'text-white'}
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
