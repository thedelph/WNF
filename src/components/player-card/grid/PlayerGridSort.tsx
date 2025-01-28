import React from 'react';
import { Player } from '../PlayerCardTypes';

interface SortConfig {
  key: keyof Player;
  direction: 'asc' | 'desc';
}

interface SortProps {
  sortConfig: SortConfig;
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>;
}

/**
 * Component for sorting player grid data
 * Provides options to sort by various player attributes
 */
export const PlayerGridSort: React.FC<SortProps> = ({
  sortConfig,
  setSortConfig,
}) => {
  const handleSort = (key: keyof Player) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortButtonClass = (key: keyof Player) => {
    return `btn btn-sm ${sortConfig.key === key ? 'btn-primary' : 'btn-ghost'}`;
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => handleSort('xp')}
        className={getSortButtonClass('xp')}
      >
        XP {sortConfig.key === 'xp' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </button>
      <button
        onClick={() => handleSort('winRate')}
        className={getSortButtonClass('winRate')}
      >
        Win Rate {sortConfig.key === 'winRate' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </button>
      <button
        onClick={() => handleSort('caps')}
        className={getSortButtonClass('caps')}
      >
        Caps {sortConfig.key === 'caps' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </button>
      <button
        onClick={() => handleSort('currentStreak')}
        className={getSortButtonClass('currentStreak')}
      >
        Streak {sortConfig.key === 'currentStreak' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </button>
      <button
        onClick={() => handleSort('totalGames')}
        className={getSortButtonClass('totalGames')}
      >
        Games {sortConfig.key === 'totalGames' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </button>
      <button
        onClick={() => handleSort('friendlyName')}
        className={getSortButtonClass('friendlyName')}
      >
        Name {sortConfig.key === 'friendlyName' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </button>
    </div>
  );
};
