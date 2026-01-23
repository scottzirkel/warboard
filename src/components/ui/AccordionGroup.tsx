'use client';

import { useState, ReactNode } from 'react';

interface AccordionItemProps {
  id: string;
  title: ReactNode;
  children: ReactNode;
  isOpen?: boolean;
  onToggle?: (id: string) => void;
  badge?: ReactNode;
  rightContent?: ReactNode;
  variant?: 'default' | 'activated';
  className?: string;
}

export function AccordionItem({
  id,
  title,
  children,
  isOpen = false,
  onToggle,
  badge,
  rightContent,
  variant = 'default',
  className = '',
}: AccordionItemProps) {
  const handleToggle = () => {
    onToggle?.(id);
  };

  const isActivated = variant === 'activated';
  const headerBg = isActivated ? 'bg-green-900/40' : 'bg-gray-700/50';
  const headerRing = isActivated ? 'ring-1 ring-green-500/30' : '';
  const textColor = isActivated ? 'text-green-300' : 'text-gray-200';

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`
          w-full flex items-center justify-between px-3 py-2
          ${headerBg} ${headerRing}
          hover:bg-gray-600/50 transition-colors
          cursor-pointer
        `}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`
              w-4 h-4 transition-transform duration-200
              ${isOpen ? 'rotate-90' : ''}
              ${textColor}
            `}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className={`font-medium ${textColor}`}>{title}</span>
          {badge}
        </div>
        {rightContent}
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-200
          ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-3 bg-gray-800/30 border-t border-gray-700/30">
          {children}
        </div>
      </div>
    </div>
  );
}

interface AccordionGroupProps {
  children: ReactNode;
  defaultOpenIds?: string[];
  allowMultiple?: boolean;
  className?: string;
}

export function AccordionGroup({
  children,
  defaultOpenIds = [],
  allowMultiple = true,
  className = '',
}: AccordionGroupProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpenIds));

  const handleToggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  };

  const isOpen = (id: string) => openIds.has(id);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Pass isOpen and onToggle to children via cloneElement or context */}
      {/* For simplicity, we use render props pattern in the actual usage */}
      {typeof children === 'function'
        ? (children as (props: { isOpen: (id: string) => boolean; onToggle: (id: string) => void }) => ReactNode)({ isOpen, onToggle: handleToggle })
        : children}
    </div>
  );
}

interface LoadoutGroupAccordionProps {
  id: string;
  name: string;
  modelCount: number;
  isPaired?: boolean;
  isCollapsed: boolean;
  isActivated?: boolean;
  onToggleCollapse: () => void;
  onToggleActivated?: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Loadout group accordion matching Alpine.js styling:
 * - Chevron is downward arrow, rotates -90deg when collapsed
 * - Act button uses bg-white/20 when not activated
 * - No border on container, no background on content
 */
export function LoadoutGroupAccordion({
  id: _id,
  name,
  modelCount,
  isPaired = false,
  isCollapsed,
  isActivated = false,
  onToggleCollapse,
  onToggleActivated,
  children,
  className = '',
}: LoadoutGroupAccordionProps) {
  const headerBg = isActivated ? 'bg-green-900/40' : 'bg-black/20';
  const headerRing = isActivated ? 'ring-1 ring-green-600/50' : '';
  const chevronColor = isActivated ? 'text-green-400' : 'text-gray-400';
  const countColor = isActivated ? 'text-green-400' : 'text-accent-400';
  const nameColor = isActivated ? 'text-green-300' : 'text-gray-200';
  const hoverBg = isActivated ? 'hover:bg-green-800/40' : 'hover:bg-white/5';

  return (
    <div className={`rounded overflow-hidden transition-colors ${headerBg} ${headerRing} ${className}`}>
      {/* Header (Clickable) */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors ${hoverBg}`}
        onClick={onToggleCollapse}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 transition-transform ${isCollapsed ? '-rotate-90' : ''} ${chevronColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className={`text-xs font-bold ${countColor}`}>{modelCount}×</span>
        <span className={`text-sm font-medium ${nameColor}`}>{name}</span>
        {isPaired && (
          <span
            className="text-[10px] text-blue-400 font-medium"
            title="Paired loadout (equipped together)"
          >
            ⬡
          </span>
        )}

        {/* Activation Toggle Button */}
        {onToggleActivated && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActivated();
            }}
            className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              isActivated
                ? 'bg-green-600 text-white'
                : 'bg-white/20 hover:bg-white/30 text-white/70'
            }`}
            title={isActivated ? 'Mark as not activated' : 'Mark as activated'}
          >
            {isActivated ? '✓' : 'Act'}
          </button>
        )}
      </div>

      {/* Collapsible Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          !isCollapsed ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-2 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
}
