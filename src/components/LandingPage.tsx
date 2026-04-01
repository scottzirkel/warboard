'use client';

import { useState } from 'react';
import Image from 'next/image';
import { availableArmies, type AvailableArmy } from '@/stores/armyStore';
import { useUIStore } from '@/stores/uiStore';
import { UserMenu } from '@/components/auth';
import { Modal } from '@/components/ui';
import { GameHistoryPanel } from './GameHistoryPanel';

interface LandingPageProps {
  onSelectArmy: (armyId: string) => void;
  isLoading?: boolean;
}

// Faction theme colors for the cards
const factionColors: Record<string, { darkBg: string; darkBorder: string; darkText: string; accent: string }> = {
  custodes: {
    darkBg: 'from-yellow-900/30 to-yellow-950/40',
    darkBorder: 'border-yellow-600/30 hover:border-yellow-500/60',
    darkText: 'text-yellow-400',
    accent: '#d4a72c',
  },
  tyranids: {
    darkBg: 'from-purple-900/30 to-purple-950/40',
    darkBorder: 'border-purple-600/30 hover:border-purple-500/60',
    darkText: 'text-purple-400',
    accent: '#a855f7',
  },
  spacemarines: {
    darkBg: 'from-blue-900/30 to-blue-950/40',
    darkBorder: 'border-blue-600/30 hover:border-blue-500/60',
    darkText: 'text-blue-400',
    accent: '#3b82f6',
  },
  necrons: {
    darkBg: 'from-emerald-900/30 to-emerald-950/40',
    darkBorder: 'border-emerald-600/30 hover:border-emerald-500/60',
    darkText: 'text-emerald-400',
    accent: '#10b981',
  },
  orks: {
    darkBg: 'from-lime-900/30 to-lime-950/40',
    darkBorder: 'border-lime-600/30 hover:border-lime-500/60',
    darkText: 'text-lime-400',
    accent: '#22c55e',
  },
  chaosmarines: {
    darkBg: 'from-red-900/30 to-red-950/40',
    darkBorder: 'border-red-600/30 hover:border-red-500/60',
    darkText: 'text-red-400',
    accent: '#ef4444',
  },
  tau: {
    darkBg: 'from-amber-900/30 to-amber-950/40',
    darkBorder: 'border-amber-600/30 hover:border-amber-500/60',
    darkText: 'text-amber-400',
    accent: '#f59e0b',
  },
  blacktemplars: {
    darkBg: 'from-slate-800/30 to-slate-950/40',
    darkBorder: 'border-slate-500/30 hover:border-slate-400/60',
    darkText: 'text-slate-300',
    accent: '#64748b',
  },
  aeldari: {
    darkBg: 'from-teal-900/30 to-teal-950/40',
    darkBorder: 'border-teal-600/30 hover:border-teal-500/60',
    darkText: 'text-teal-400',
    accent: '#14b8a6',
  },
  darkangels: {
    darkBg: 'from-green-900/30 to-green-950/40',
    darkBorder: 'border-green-600/30 hover:border-green-500/60',
    darkText: 'text-green-400',
    accent: '#1a7a3a',
  },
};

function FactionCard({ army, onClick, colorMode }: { army: AvailableArmy; onClick: () => void; colorMode: 'dark' | 'light' }) {
  const colors = factionColors[army.id] || {
    darkBg: 'from-gray-800/30 to-gray-900/40',
    darkBorder: 'border-cm-border-input hover:border-white/30',
    darkText: 'text-cm-text',
    accent: '#64748b',
  };
  const isLight = colorMode === 'light';
  const lightCardStyle = isLight ? {
    background: `linear-gradient(135deg, color-mix(in srgb, ${colors.accent} 16%, rgba(255, 255, 255, 0.94)), color-mix(in srgb, ${colors.accent} 7%, rgba(246, 241, 232, 0.98)))`,
    borderColor: `color-mix(in srgb, ${colors.accent} 24%, rgba(177, 156, 130, 0.75))`,
    boxShadow: `0 1px 0 rgba(255,255,255,0.75) inset, 0 12px 24px color-mix(in srgb, ${colors.accent} 10%, transparent), 0 2px 8px rgba(73, 48, 22, 0.08)`,
  } : undefined;
  const lightHeadingStyle = isLight ? {
    color: `color-mix(in srgb, ${colors.accent} 54%, #201911)`,
  } : undefined;

  return (
    <button
      onClick={onClick}
      style={lightCardStyle}
      className={`
        w-full p-4 rounded-xl
        border
        transition-all duration-200
        hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98]
        text-left
        ${isLight ? 'bg-cm-surface-card hover:bg-cm-surface-elevated hover:border-cm-border' : `bg-gradient-to-br ${colors.darkBg} ${colors.darkBorder}`}
      `}
    >
      <h3
        style={lightHeadingStyle}
        className={`font-semibold ${isLight ? 'text-cm-text' : colors.darkText}`}
      >
        {army.name}
      </h3>
    </button>
  );
}

export function LandingPage({ onSelectArmy, isLoading = false }: LandingPageProps) {
  const [showHistory, setShowHistory] = useState(false);
  const colorMode = useUIStore((state) => state.colorMode);
  const isLight = colorMode === 'light';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--cm-bg-gradient)' }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isLight
            ? 'radial-gradient(circle at top, rgba(212,167,44,0.14), transparent 34%), radial-gradient(circle at 18% 22%, rgba(59,130,246,0.1), transparent 28%), radial-gradient(circle at 82% 18%, rgba(168,85,247,0.08), transparent 26%)'
            : 'radial-gradient(circle at top, rgba(212,167,44,0.08), transparent 32%), radial-gradient(circle at 18% 22%, rgba(59,130,246,0.06), transparent 28%)',
        }}
      />

      {/* Sign in / user menu in top-right corner */}
      <div className="absolute top-4 right-4">
        <UserMenu />
      </div>

      <div className="max-w-md w-full space-y-8 text-center relative z-10">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/warboard-logo-v2.png"
            alt="Warboard"
            width={280}
            height={280}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* Tagline */}
        <p className="text-cm-text-secondary text-sm -mt-4">
          Build your army, track your battles.
        </p>

        {/* Faction Selection */}
        <div className="space-y-3">
          <p className="text-cm-text-muted text-xs uppercase tracking-wider font-medium">
            Choose your faction
          </p>

          <div className="grid grid-cols-2 gap-3">
            {availableArmies.map((army) => (
              <FactionCard
                key={army.id}
                army={army}
                colorMode={colorMode}
                onClick={() => onSelectArmy(army.id)}
              />
            ))}
          </div>
        </div>

        {/* Game History */}
        <button
          onClick={() => setShowHistory(true)}
          className="text-cm-text-muted hover:text-cm-text-secondary text-sm transition-colors flex items-center gap-2 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Game History
        </button>

        <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Game History" size="md">
          <GameHistoryPanel />
        </Modal>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-cm-text-muted text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-500" />
            <span>Loading...</span>
          </div>
        )}

        {/* Footer hint */}
        <p className="text-cm-text-faint text-xs pt-4">
          You can change your faction anytime in Build mode.
        </p>
      </div>
    </div>
  );
}
