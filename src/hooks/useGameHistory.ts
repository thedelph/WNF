import { useState } from 'react';
import { GameHistory } from '../types/game';

interface GameFilters {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  team: '' | 'Blue' | 'Orange';
  outcome: '' | 'Won' | 'Lost' | 'Draw' | 'Unknown';
}

interface SortConfig {
  key: 'team' | 'sequence_number';
  direction: 'asc' | 'desc';
}

/**
 * Custom hook for managing game history sorting and filtering
 * Provides functions for sorting and filtering game history data
 */
export const useGameHistory = () => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'sequence_number',
    direction: 'desc'
  });

  const [filters, setFilters] = useState<GameFilters>({
    dateRange: {
      start: null,
      end: null
    },
    team: '',
    outcome: ''
  });

  /**
   * Determines the outcome of a game from a player's perspective
   */
  const getGameOutcome = (game: GameHistory): string | null => {
    if (!game?.games?.outcome) return null;
    if (game.games.outcome === 'draw') return 'Draw';
    if (!game?.team) return null;
    
    const team = game.team.toLowerCase();
    const isWin = (team === 'blue' && game.games.outcome === 'blue_win') ||
                 (team === 'orange' && game.games.outcome === 'orange_win');
    return isWin ? 'Won' : 'Lost';
  };

  /**
   * Sorts and filters games based on current configuration
   */
  const sortAndFilterGames = (games: GameHistory[]) => {
    let filteredGames = [...games].filter(game => game && game.games);

    // Apply filters
    if (filters.dateRange.start || filters.dateRange.end) {
      filteredGames = filteredGames.filter(game => {
        if (!game.games?.date) return false;
        const gameDate = new Date(game.games.date);
        const afterStart = !filters.dateRange.start || gameDate >= filters.dateRange.start;
        const beforeEnd = !filters.dateRange.end || gameDate <= filters.dateRange.end;
        return afterStart && beforeEnd;
      });
    }

    if (filters.team) {
      filteredGames = filteredGames.filter(game =>
        game.team && game.team.toLowerCase() === filters.team.toLowerCase()
      );
    }

    if (filters.outcome) {
      filteredGames = filteredGames.filter(game => {
        const outcome = getGameOutcome(game);
        return outcome === filters.outcome;
      });
    }

    // Apply sorting
    filteredGames.sort((a, b) => {
      if (sortConfig.key === 'sequence_number') {
        if (!a.games?.sequence_number || !b.games?.sequence_number) return 0;
        return sortConfig.direction === 'asc'
          ? a.games.sequence_number - b.games.sequence_number
          : b.games.sequence_number - a.games.sequence_number;
      }
      if (sortConfig.key === 'team') {
        if (!a.team || !b.team) return 0;
        return sortConfig.direction === 'asc'
          ? a.team.localeCompare(b.team)
          : b.team.localeCompare(a.team);
      }
      return 0;
    });

    return filteredGames;
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return {
    sortConfig,
    filters,
    setFilters,
    handleSort,
    sortAndFilterGames,
    getGameOutcome
  };
};
