'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { GameResultInfo, GameResult } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'army-tracker-game-history';

// ============================================================================
// Types
// ============================================================================

interface UseGameHistoryReturn {
  games: GameResultInfo[];
  isLoading: boolean;
  error: string | null;
  fetchGames: () => void;
  saveGame: (data: Omit<GameResult, 'id'>) => Promise<boolean>;
  deleteGame: (id: string) => Promise<boolean>;
}

// ============================================================================
// LocalStorage Helpers
// ============================================================================

function getStoredGames(): GameResult[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as GameResult[];
  } catch {
    return [];
  }
}

function setStoredGames(games: GameResult[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch (err) {
    console.error('Failed to save game history to localStorage:', err);
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGameHistory(): UseGameHistoryReturn {
  const { data: session, status } = useSession();
  const isSignedIn = status === 'authenticated' && !!session?.user;

  const [games, setGames] = useState<GameResultInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSignedIn) {
        const res = await fetch('/api/games');
        if (!res.ok) throw new Error('Failed to fetch game history');

        const data: GameResultInfo[] = await res.json();
        setGames(data);
      } else {
        const stored = getStoredGames();
        const infos: GameResultInfo[] = stored.map(g => ({
          id: g.id,
          date: g.date,
          army: g.army,
          opponentFaction: g.opponentFaction,
          result: g.result,
          totalVP: g.totalVP,
        }));
        // Sort by date descending
        infos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setGames(infos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game history');
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (status !== 'loading') {
      fetchGames();
    }
  }, [status, fetchGames]);

  const saveGame = useCallback(async (data: Omit<GameResult, 'id'>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSignedIn) {
        const res = await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to save game result');
        }

        await fetchGames();
        return true;
      }

      // Guest mode: localStorage
      const stored = getStoredGames();
      const newGame: GameResult = {
        ...data,
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      stored.unshift(newGame);
      setStoredGames(stored);
      await fetchGames();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game result');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, fetchGames]);

  const deleteGame = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSignedIn) {
        const res = await fetch(`/api/games/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          setError('Failed to delete game result');
          return false;
        }

        await fetchGames();
        return true;
      }

      // Guest mode: localStorage
      const stored = getStoredGames();
      const filtered = stored.filter(g => g.id !== id);

      if (filtered.length === stored.length) {
        setError('Game result not found');
        return false;
      }

      setStoredGames(filtered);
      await fetchGames();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete game result');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, fetchGames]);

  return {
    games,
    isLoading,
    error,
    fetchGames,
    saveGame,
    deleteGame,
  };
}
