'use client';

import { useState, useMemo } from 'react';
import type { Unit } from '@/types';

interface UnitRosterPanelProps {
  units: Unit[];
  onSelectUnit: (unit: Unit) => void;
  onAddUnit: (unit: Unit) => void;
  selectedUnitId?: string;
  isLoading?: boolean;
  className?: string;
}

// Unit type grouping
type UnitTypeGroup = 'Characters' | 'Battleline' | 'Infantry' | 'Vehicles' | 'Other';

function getUnitTypeGroup(keywords: string[]): UnitTypeGroup {
  if (keywords.includes('Character')) return 'Characters';
  if (keywords.includes('Battleline')) return 'Battleline';
  if (keywords.includes('Vehicle') || keywords.includes('Monster')) return 'Vehicles';
  if (keywords.includes('Infantry')) return 'Infantry';
  return 'Other';
}

const groupPriority: UnitTypeGroup[] = ['Characters', 'Battleline', 'Infantry', 'Vehicles', 'Other'];

// Simple accordion component
interface SimpleAccordionProps {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SimpleAccordion({ title, count, isOpen, onToggle, children }: SimpleAccordionProps) {
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center px-4 py-3 hover:bg-white/5 transition-colors text-left touch-highlight"
      >
        <span className="font-semibold text-accent-300">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{count}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[2000px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}
      >
        {children}
      </div>
    </div>
  );
}

export function UnitRosterPanel({
  units,
  onSelectUnit,
  onAddUnit: _onAddUnit,
  selectedUnitId,
  isLoading = false,
  className = '',
}: UnitRosterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(groupPriority));

  // Filter units by search query
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) {
      return units;
    }

    const query = searchQuery.toLowerCase();
    return units.filter(
      (unit) =>
        unit.name.toLowerCase().includes(query) ||
        unit.keywords.some((kw) => kw.toLowerCase().includes(query))
    );
  }, [units, searchQuery]);

  // Group units by type
  const groupedUnits = useMemo(() => {
    const groups: Record<string, Unit[]> = {};

    filteredUnits.forEach((unit) => {
      const group = getUnitTypeGroup(unit.keywords);

      if (!groups[group]) {
        groups[group] = [];
      }

      groups[group].push(unit);
    });

    // Sort units within each group alphabetically
    Object.values(groups).forEach((groupUnits) => {
      groupUnits.sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [filteredUnits]);

  // Get sorted group names
  const sortedGroups = useMemo(() => {
    return groupPriority.filter((g) => groupedUnits[g]?.length > 0);
  }, [groupedUnits]);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  // Get points display for a unit (matching Alpine.js - shows range for multi-model units)
  const getPointsDisplay = (unit: Unit): string => {
    const modelCounts = Object.keys(unit.points).map(Number).sort((a, b) => a - b);
    const minCount = modelCounts[0];
    const maxCount = modelCounts[modelCounts.length - 1];
    const minPoints = unit.points[String(minCount)] || 0;
    const maxPoints = unit.points[String(maxCount)] || 0;

    if (minPoints === maxPoints || modelCounts.length === 1) {
      return `${minPoints} pts`;
    }
    return `${minPoints}-${maxPoints} pts`;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="section-header">Unit Roster</h3>
        <span className="text-xs text-white/40">{filteredUnits.length} units</span>
      </div>

      {/* Search Input */}
      <div className="mb-4 shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search units..."
          className="input-dark w-full"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/40">
            <div className="animate-spin w-6 h-6 border-2 border-accent-400 border-t-transparent rounded-full mx-auto mb-2" />
            <span className="text-sm">Loading units...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredUnits.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/40">
            <p className="text-sm">
              {searchQuery ? 'No units match your search' : 'No units available'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-accent-400 hover:text-accent-300"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unit List */}
      {!isLoading && filteredUnits.length > 0 && (
        <div className="flex-1 overflow-y-auto -mx-4 px-4 scroll-smooth">
          {sortedGroups.map((group) => (
            <SimpleAccordion
              key={group}
              title={group}
              count={groupedUnits[group].length}
              isOpen={openGroups.has(group)}
              onToggle={() => toggleGroup(group)}
            >
              <div className="space-y-1">
                {groupedUnits[group].map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => onSelectUnit(unit)}
                    className={`
                      list-row touch-highlight cursor-pointer rounded-lg w-full
                      ${unit.id === selectedUnitId ? 'bg-accent-tint-strong' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between py-2 px-3 w-full">
                      <span className="text-sm text-white">{unit.name}</span>
                      <span className="text-xs text-white/50">{getPointsDisplay(unit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SimpleAccordion>
          ))}
        </div>
      )}
    </div>
  );
}
