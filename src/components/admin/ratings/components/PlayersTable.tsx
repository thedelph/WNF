import React from 'react';
import { motion } from 'framer-motion';
import { Player, SortConfig } from '../types';
import { FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import { formatRating } from '../../../../utils/ratingFormatters';

interface PlayersTableProps {
  players: Player[];
  sortConfig: SortConfig;
  onSort: (key: SortConfig['key']) => void;
  onPlayerSelect: (playerId: string) => void;
  selectedPlayerId: string | null;
}

export const PlayersTable: React.FC<PlayersTableProps> = ({
  players,
  sortConfig,
  onSort,
  onPlayerSelect,
  selectedPlayerId,
}) => {
  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />;
  };

  // Sort players based on current configuration
  const sortedPlayers = [...players].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    if (sortConfig.key === 'friendly_name') {
      return direction * a.friendly_name.localeCompare(b.friendly_name);
    }
    if (sortConfig.key === 'total_ratings') {
      return direction * ((a.ratings?.length || 0) - (b.ratings?.length || 0));
    }
    const aValue = a[sortConfig.key] ?? 0;
    const bValue = b[sortConfig.key] ?? 0;
    return direction * (aValue - bValue);
  });

  return (
    <div className="overflow-x-auto">
      <table className="table table-xs sm:table-sm md:table-md w-full">
        <thead>
          <tr>
            <th onClick={() => onSort('friendly_name')} className="cursor-pointer">
              <span className="flex items-center gap-1">
                <span className="hidden sm:inline">Player Name</span>
                <span className="sm:hidden">Player</span>
                {getSortIcon('friendly_name')}
              </span>
            </th>
            <th onClick={() => onSort('attack_rating')} className="cursor-pointer hidden sm:table-cell">
              <span className="flex items-center gap-1">
                <span className="hidden md:inline">Attack Rating</span>
                <span className="md:hidden">Attack</span>
                {getSortIcon('attack_rating')}
              </span>
            </th>
            <th onClick={() => onSort('defense_rating')} className="cursor-pointer hidden sm:table-cell">
              <span className="flex items-center gap-1">
                <span className="hidden md:inline">Defense Rating</span>
                <span className="md:hidden">Defense</span>
                {getSortIcon('defense_rating')}
              </span>
            </th>
            <th onClick={() => onSort('game_iq')} className="cursor-pointer hidden md:table-cell">
              <span className="flex items-center gap-1">
                Game IQ
                {getSortIcon('game_iq')}
              </span>
            </th>
            <th onClick={() => onSort('average_gk_rating')} className="cursor-pointer hidden lg:table-cell">
              <span className="flex items-center gap-1">
                GK
                {getSortIcon('average_gk_rating')}
              </span>
            </th>
            <th onClick={() => onSort('total_ratings')} className="cursor-pointer">
              <span className="flex items-center gap-1">
                <span className="hidden sm:inline">Total</span>
                {getSortIcon('total_ratings')}
              </span>
            </th>
            <th className="sm:hidden">Ratings</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player) => (
            <motion.tr
              key={player.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`hover cursor-pointer ${
                selectedPlayerId === player.id ? 'bg-primary bg-opacity-20' : ''
              }`}
              onClick={() => onPlayerSelect(player.id)}
            >
              <td className="font-medium">{player.friendly_name}</td>
              <td className="hidden sm:table-cell">{formatRating(player.attack_rating)}</td>
              <td className="hidden sm:table-cell">{formatRating(player.defense_rating)}</td>
              <td className="hidden md:table-cell">{formatRating(player.game_iq)}</td>
              <td className="hidden lg:table-cell">{formatRating(player.average_gk_rating)}</td>
              <td>{player.ratings?.length || 0}</td>
              <td className="sm:hidden">
                <div className="flex flex-col gap-1">
                  <span className="badge badge-xs">A: {formatRating(player.attack_rating)}</span>
                  <span className="badge badge-xs">D: {formatRating(player.defense_rating)}</span>
                  <span className="badge badge-xs">IQ: {formatRating(player.game_iq)}</span>
                  <span className="badge badge-xs">GK: {formatRating(player.average_gk_rating)}</span>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
