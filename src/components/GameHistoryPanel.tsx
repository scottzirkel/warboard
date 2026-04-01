'use client';

import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { useGameHistory } from '@/hooks/useGameHistory';
import type { GameResultInfo } from '@/types';

const resultColors: Record<string, { badge: 'success' | 'error' | 'default'; label: string }> = {
  win: { badge: 'success', label: 'W' },
  loss: { badge: 'error', label: 'L' },
  draw: { badge: 'default', label: 'D' },
};

export function GameHistoryPanel() {
  const { games, isLoading, deleteGame } = useGameHistory();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Stats
  const totalGames = games.length;
  const wins = games.filter(g => g.result === 'win').length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const avgVP = totalGames > 0 ? Math.round(games.reduce((sum, g) => sum + g.totalVP, 0) / totalGames) : 0;
  const bestVP = totalGames > 0 ? Math.max(...games.map(g => g.totalVP)) : 0;

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    await deleteGame(id);
    setDeleteConfirm(null);
  };

  if (isLoading && games.length === 0) {
    return <div className="text-center text-cm-text-muted py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Banner */}
      {totalGames > 0 && (
        <div className="grid grid-cols-4 gap-2 text-center">
          <StatBox label="Games" value={totalGames} />
          <StatBox label="Win %" value={`${winRate}%`} />
          <StatBox label="Avg VP" value={avgVP} />
          <StatBox label="Best VP" value={bestVP} />
        </div>
      )}

      {/* Game List */}
      {games.length === 0 ? (
        <div className="text-center text-cm-text-muted py-8 text-sm">
          No games recorded yet. Play a game and save the result to see it here.
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              deleteConfirm={deleteConfirm === game.id}
              onDelete={() => handleDelete(game.id)}
              onCancelDelete={() => setDeleteConfirm(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-cm-surface-hover-subtle rounded-lg p-2">
      <div className="text-[10px] text-cm-text-muted uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}

function GameCard({
  game,
  deleteConfirm,
  onDelete,
  onCancelDelete,
}: {
  game: GameResultInfo;
  deleteConfirm: boolean;
  onDelete: () => void;
  onCancelDelete: () => void;
}) {
  const { badge, label } = resultColors[game.result] ?? resultColors.draw;
  const dateStr = new Date(game.date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <Badge variant={badge} className="text-sm font-bold w-7 text-center">
          {label}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">vs {game.opponentFaction}</span>
            <span className="text-xs text-cm-text-faint">{dateStr}</span>
          </div>
          <div className="text-xs text-cm-text-muted mt-0.5">
            {game.army} &middot; {game.totalVP} VP
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {deleteConfirm ? (
            <>
              <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
              <Button variant="secondary" size="sm" onClick={onCancelDelete}>Cancel</Button>
            </>
          ) : (
            <button
              onClick={onDelete}
              className="p-2 text-cm-text-faint hover:text-red-400 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
