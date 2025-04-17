import { useState } from 'react';

/**
 * Comprehensive PlayerGameHistory interface that handles all possible data structures
 * for game history in the profile page. This is separate from the original GameHistory
 * to avoid type conflicts while handling the various formats from different API endpoints.
 */
export interface PlayerGameHistory {
  // Player's team in the game
  team?: string;
  
  // Player's status in the game
  status?: string;
  
  // First data structure format (games property)
  games?: {
    id: string;
    date: string;
    score_blue: number | null;
    score_orange: number | null;
    outcome: 'blue_win' | 'orange_win' | 'draw' | null;
    sequence_number?: number;
    is_historical?: boolean;
    needs_completion?: boolean;
    completed?: boolean;
    blue_team_size?: number;
    orange_team_size?: number;
    player_team?: string; // Additional field for player's team
    [key: string]: any; // Allow for dynamic properties
  };
  
  // Alternative data structure format (game property)
  game?: {
    id: string;
    date: string;
    score_blue: number | null;
    score_orange: number | null;
    outcome: 'blue_win' | 'orange_win' | 'draw' | null;
    sequence_number?: number;
    is_historical?: boolean;
    needs_completion?: boolean;
    completed?: boolean;
    player_team?: string; // Additional field for player's team
    [key: string]: any; // Allow for dynamic properties
  };
  
  // Root level properties that might exist
  completed?: boolean;
  
  // Allow for any additional properties
  [key: string]: any;
}

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
   * 
   * This function handles different data structures that might be present
   * in the PlayerGameHistory object and correctly identifies game outcomes
   */
  const getGameOutcome = (game: PlayerGameHistory): 'Won' | 'Lost' | 'Draw' | 'Blue Won' | 'Orange Won' | null => {
    // First determine if we can find the game outcome from any possible data structure
    const gameOutcome = game?.games?.outcome || game?.game?.outcome;
    
    // If there's no outcome data at all, we can't determine the result
    if (!gameOutcome) return null;
    
    // Handle draws directly since they don't depend on team
    if (gameOutcome === 'draw') return 'Draw';
    
    // Try to determine the player's team from various possible structures
    // This is the critical part that was failing
    let playerTeam = null;
    
    // First check the team property directly
    if (game?.team) {
      playerTeam = game.team.toLowerCase();
    } 
    // Check if team info might be in the status field
    else if (game?.status === 'selected') {
      // If player was selected but we don't know team, try to infer from other properties
      // such as checking the game_registrations data
      if (game?.games?.player_team) {
        playerTeam = game.games.player_team.toLowerCase();
      } else if (game?.game?.player_team) {
        playerTeam = game.game.player_team.toLowerCase();
      }
      // In case we have a team color in a field we didn't expect
      else if (typeof game === 'object') {
        // Try to find any property that might contain 'blue' or 'orange'
        for (const key in game) {
          const value = game[key];
          if (typeof value === 'string' && (value.toLowerCase() === 'blue' || value.toLowerCase() === 'orange')) {
            playerTeam = value.toLowerCase();
            break;
          }
        }
      }
    }
    
    // If we have a team, determine win/loss from player's perspective
    if (playerTeam) {
      const isWin = (playerTeam === 'blue' && gameOutcome === 'blue_win') ||
                  (playerTeam === 'orange' && gameOutcome === 'orange_win');
      return isWin ? 'Won' : 'Lost';
    }
    
    // If we can't determine the player's team but have an outcome, return the team that won
    return gameOutcome === 'blue_win' ? 'Blue Won' : 
           gameOutcome === 'orange_win' ? 'Orange Won' : 'Draw';
  };

  /**
   * Sorts and filters games based on current configuration
   */
  const sortAndFilterGames = (games: PlayerGameHistory[]) => {
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
