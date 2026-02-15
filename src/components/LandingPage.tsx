'use client';

import Image from 'next/image';
import { availableArmies, type AvailableArmy } from '@/stores/armyStore';
import { UserMenu } from '@/components/auth';

interface LandingPageProps {
  onSelectArmy: (armyId: string) => void;
  isLoading?: boolean;
}

// Faction theme colors for the cards
const factionColors: Record<string, { bg: string; border: string; text: string }> = {
  custodes: {
    bg: 'from-yellow-900/30 to-yellow-950/40',
    border: 'border-yellow-600/30 hover:border-yellow-500/60',
    text: 'text-yellow-400',
  },
  tyranids: {
    bg: 'from-purple-900/30 to-purple-950/40',
    border: 'border-purple-600/30 hover:border-purple-500/60',
    text: 'text-purple-400',
  },
  spacemarines: {
    bg: 'from-blue-900/30 to-blue-950/40',
    border: 'border-blue-600/30 hover:border-blue-500/60',
    text: 'text-blue-400',
  },
  necrons: {
    bg: 'from-emerald-900/30 to-emerald-950/40',
    border: 'border-emerald-600/30 hover:border-emerald-500/60',
    text: 'text-emerald-400',
  },
  orks: {
    bg: 'from-lime-900/30 to-lime-950/40',
    border: 'border-lime-600/30 hover:border-lime-500/60',
    text: 'text-lime-400',
  },
  chaosmarines: {
    bg: 'from-red-900/30 to-red-950/40',
    border: 'border-red-600/30 hover:border-red-500/60',
    text: 'text-red-400',
  },
};

function FactionCard({ army, onClick }: { army: AvailableArmy; onClick: () => void }) {
  const colors = factionColors[army.id] || {
    bg: 'from-gray-800/30 to-gray-900/40',
    border: 'border-white/10 hover:border-white/30',
    text: 'text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-xl
        bg-gradient-to-br ${colors.bg}
        border ${colors.border}
        transition-all duration-200
        hover:scale-[1.02] active:scale-[0.98]
        text-left
      `}
    >
      <h3 className={`font-semibold ${colors.text}`}>{army.name}</h3>
    </button>
  );
}

export function LandingPage({ onSelectArmy, isLoading = false }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 to-black relative">
      {/* Sign in / user menu in top-right corner */}
      <div className="absolute top-4 right-4">
        <UserMenu />
      </div>

      <div className="max-w-md w-full space-y-8 text-center">
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
        <p className="text-white/60 text-sm -mt-4">
          Build your army, track your battles.
        </p>

        {/* Faction Selection */}
        <div className="space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-wider font-medium">
            Choose your faction
          </p>

          <div className="grid grid-cols-2 gap-3">
            {availableArmies.map((army) => (
              <FactionCard
                key={army.id}
                army={army}
                onClick={() => onSelectArmy(army.id)}
              />
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-500" />
            <span>Loading...</span>
          </div>
        )}

        {/* Footer hint */}
        <p className="text-white/30 text-xs pt-4">
          You can change your faction anytime in Build mode.
        </p>
      </div>
    </div>
  );
}
