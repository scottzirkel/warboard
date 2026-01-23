'use client';

import { useState, useMemo } from 'react';
import { Panel } from '@/components/ui';
import { UnitSearchInput } from './UnitSearchInput';
import { UnitAccordion, getUnitTypeGroup, sortGroupsByPriority, type UnitTypeGroup } from './UnitAccordion';
import { RosterUnitRow } from './RosterUnitRow';
import type { Unit } from '@/types';

interface UnitRosterPanelProps {
  units: Unit[];
  onAddUnit: (unit: Unit) => void;
  selectedUnitId?: string;
  isLoading?: boolean;
  className?: string;
}

interface GroupedUnits {
  [key: string]: Unit[];
}

export function UnitRosterPanel({
  units,
  onAddUnit,
  selectedUnitId,
  isLoading = false,
  className = '',
}: UnitRosterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

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
    const groups: GroupedUnits = {};

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
    const groupNames = Object.keys(groupedUnits) as UnitTypeGroup[];

    return sortGroupsByPriority(groupNames);
  }, [groupedUnits]);

  return (
    <Panel
      title="Unit Roster"
      className={className}
      headerRight={
        <span className="text-xs text-gray-500">
          {filteredUnits.length} units
        </span>
      }
    >
      <div className="flex flex-col h-full">
        {/* Search Input */}
        <div className="p-3 border-b border-gray-700/30">
          <UnitSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or keyword..."
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <svg
                className="animate-spin h-8 w-8 text-accent-500 mx-auto mb-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm text-gray-400">Loading units...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredUnits.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-gray-600 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-gray-400 text-sm">
                {searchQuery ? 'No units match your search' : 'No units available'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        )}

        {/* Unit List */}
        {!isLoading && filteredUnits.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            {sortedGroups.map((group) => (
              <UnitAccordion
                key={group}
                title={group}
                count={groupedUnits[group].length}
                defaultOpen={true}
              >
                {groupedUnits[group].map((unit) => (
                  <RosterUnitRow
                    key={unit.id}
                    unit={unit}
                    onAdd={onAddUnit}
                    isSelected={unit.id === selectedUnitId}
                  />
                ))}
              </UnitAccordion>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
