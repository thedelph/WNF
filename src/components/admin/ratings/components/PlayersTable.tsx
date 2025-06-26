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
      <table className="table w-full">
        <thead>
          <tr>
            <th onClick={() => onSort('friendly_name')} className="cursor-pointer">
              Player Name {getSortIcon('friendly_name')}
            </th>
            <th onClick={() => onSort('attack_rating')} className="cursor-pointer">
              Attack Rating {getSortIcon('attack_rating')}
            </th>
            <th onClick={() => onSort('defense_rating')} className="cursor-pointer">
              Defense Rating {getSortIcon('defense_rating')}
            </th>
            <th onClick={() => onSort('game_iq')} className="cursor-pointer">
              Game IQ Rating {getSortIcon('game_iq')}
            </th>
            <th onClick={() => onSort('total_ratings')} className="cursor-pointer">
              Total Ratings {getSortIcon('total_ratings')}
            </th>
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
              <td>{player.friendly_name}</td>
              <td>{formatRating(player.attack_rating)}</td>
              <td>{formatRating(player.defense_rating)}</td>
              <td>{formatRating(player.game_iq)}</td>
              <td>{player.ratings?.length || 0}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
