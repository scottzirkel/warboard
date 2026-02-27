'use client';

import { useState, useMemo } from 'react';
import type { Unit } from '@/types';

interface UnitRosterPanelProps {
  units: (Unit & { isAlly?: boolean; allyFaction?: string })[];
  onAddUnit: (unit: Unit) => void;
  onOpenDetail: (unit: Unit) => void;
  isLoading?: boolean;
  className?: string;
}

// Extended Unit type with ally info
interface ExtendedUnit extends Unit {
  isAlly?: boolean;
  allyFaction?: string;
}

// Unit type grouping
type UnitTypeGroup = 'Characters' | 'Battleline' | 'Infantry' | 'Vehicles' | 'Other' | 'Allies';

function getUnitTypeGroup(unit: ExtendedUnit): UnitTypeGroup {
  // Allies go in their own group
  if (unit.isAlly) return 'Allies';

  const keywords = unit.keywords || [];
  if (keywords.includes('Character')) return 'Characters';
  if (keywords.includes('Battleline')) return 'Battleline';
  if (keywords.includes('Vehicle') || keywords.includes('Monster')) return 'Vehicles';
  if (keywords.includes('Infantry')) return 'Infantry';
  return 'Other';
}

const groupPriority: UnitTypeGroup[] = ['Characters', 'Battleline', 'Infantry', 'Vehicles', 'Other', 'Allies'];

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
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[4000px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}
      >
        {children}
      </div>
    </div>
  );
}

// Get key role badges for a unit (1-2 most important keywords)
function getRoleBadges(unit: Unit): string[] {
  const badges: string[] = [];
  const keywords = unit.keywords || [];

  if (keywords.includes('Character')) badges.push('Character');
  if (keywords.includes('Battleline')) badges.push('Battleline');
  if (keywords.includes('Epic Hero')) badges.push('Epic Hero');
  if (keywords.includes('Vehicle')) badges.push('Vehicle');
  if (keywords.includes('Monster')) badges.push('Monster');
  if (keywords.includes('Fly')) badges.push('Fly');

  return badges.slice(0, 2);
}

// Unit card component
interface UnitCardProps {
  unit: ExtendedUnit;
  pointsDisplay: string;
  onAdd: () => void;
  onOpenDetail: () => void;
}

function UnitCard({ unit, pointsDisplay, onAdd, onOpenDetail }: UnitCardProps) {
  const badges = getRoleBadges(unit);

  return (
    <div
      onClick={onOpenDetail}
      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 cursor-pointer transition-colors relative group shadow-sm shadow-black/20"
    >
      {/* Quick Add Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-accent-500/80 hover:bg-accent-500 text-white text-sm font-bold transition-colors"
        title={`Add ${unit.name}`}
      >
        +
      </button>

      {/* Unit Name */}
      <div className="font-medium text-sm text-white pr-8 leading-tight">{unit.name}</div>

      {/* Points */}
      <div className="text-xs text-accent-400 mt-1">{pointsDisplay}</div>

      {/* Key Stats Row */}
      <div className="flex items-center gap-2 mt-2 text-[11px] text-white/60">
        <span>M{unit.stats.m}&quot;</span>
        <span>T{unit.stats.t}</span>
        <span>SV{unit.stats.sv}</span>
        <span>W{unit.stats.w}</span>
        {unit.invuln && (
          <span className="text-accent-400">{unit.invuln} inv</span>
        )}
      </div>

      {/* Role Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {badges.map((badge) => (
            <span key={badge} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">
              {badge}
            </span>
          ))}
          {unit.isAlly && unit.allyFaction && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              {unit.allyFaction}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function UnitRosterPanel({
  units,
  onAddUnit,
  onOpenDetail,
  isLoading = false,
  className = '',
}: UnitRosterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // All groups open by default so cards are visible immediately
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
    const groups: Record<string, ExtendedUnit[]> = {};

    filteredUnits.forEach((unit) => {
      const group = getUnitTypeGroup(unit);

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
      {/* Search Input */}
      <div className="mb-4 shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search units..."
          className="input-dark flex-1"
        />
        <span className="text-xs text-white/40 shrink-0">{filteredUnits.length} units</span>
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

      {/* Unit Card Grid */}
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 px-1">
                {groupedUnits[group].map((unit) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    pointsDisplay={getPointsDisplay(unit)}
                    onAdd={() => onAddUnit(unit)}
                    onOpenDetail={() => onOpenDetail(unit)}
                  />
                ))}
              </div>
            </SimpleAccordion>
          ))}
        </div>
      )}
    </div>
  );
}
