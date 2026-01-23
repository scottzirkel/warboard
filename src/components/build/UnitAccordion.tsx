'use client';

import { useState, ReactNode } from 'react';

interface UnitAccordionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function UnitAccordion({
  title,
  count,
  defaultOpen = true,
  children,
  className = '',
}: UnitAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border-b border-gray-700/30 last:border-b-0 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            }`}
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
          <span className="text-sm font-medium text-gray-200">{title}</span>
        </div>
        <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
          {count}
        </span>
      </button>
      {isOpen && (
        <div className="pb-2">
          {children}
        </div>
      )}
    </div>
  );
}

// Unit type grouping helper
export type UnitTypeGroup = 'Character' | 'Battleline' | 'Infantry' | 'Monster' | 'Mounted' | 'Vehicle' | 'Other';

const groupPriority: Record<UnitTypeGroup, number> = {
  'Character': 1,
  'Battleline': 2,
  'Infantry': 3,
  'Monster': 4,
  'Mounted': 5,
  'Vehicle': 6,
  'Other': 7,
};

export function getUnitTypeGroup(keywords: string[]): UnitTypeGroup {
  if (keywords.includes('Character')) return 'Character';
  if (keywords.includes('Battleline')) return 'Battleline';
  if (keywords.includes('Monster')) return 'Monster';
  if (keywords.includes('Mounted')) return 'Mounted';
  if (keywords.includes('Vehicle')) return 'Vehicle';
  if (keywords.includes('Infantry')) return 'Infantry';

  return 'Other';
}

export function sortGroupsByPriority(groups: UnitTypeGroup[]): UnitTypeGroup[] {
  return [...groups].sort((a, b) => groupPriority[a] - groupPriority[b]);
}
