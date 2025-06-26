import React from 'react';
import { motion } from 'framer-motion';
import { Player, Rating, SortConfig } from '../types';
import { formatDate } from '../../../../utils/dateUtils';
import { formatRating } from '../../../../utils/ratingFormatters';

interface PlayerRatingsTableProps {
  ratings: Rating[];
  sortConfig: SortConfig;
  onSort: (key: SortConfig['key']) => void;
  mode: 'received' | 'given';
}

export const PlayerRatingsTable: React.FC<PlayerRatingsTableProps> = ({
  ratings,
  sortConfig,
  onSort,
  mode,
}) => {
  // Sort ratings based on current configuration
  const sortedRatings = [...ratings].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    if (sortConfig.key === 'friendly_name') {
      const nameA = mode === 'received' ? a.rater?.friendly_name : a.rated_player?.friendly_name;
      const nameB = mode === 'received' ? b.rater?.friendly_name : b.rated_player?.friendly_name;
      return direction * (nameA?.localeCompare(nameB || '') || 0);
    }
    return direction * ((a[sortConfig.key] || 0) - (b[sortConfig.key] || 0));
  });

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th onClick={() => onSort('friendly_name')} className="cursor-pointer">
              {mode === 'received' ? 'Rater Name' : 'Rated Player'}
            </th>
            <th onClick={() => onSort('attack_rating')} className="cursor-pointer">
              Attack Rating
            </th>
            <th onClick={() => onSort('defense_rating')} className="cursor-pointer">
              Defense Rating
            </th>
            <th onClick={() => onSort('game_iq_rating')} className="cursor-pointer">
              Game IQ Rating
            </th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {sortedRatings.map((rating) => (
            <motion.tr
              key={rating.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hover"
            >
              <td>
                {mode === 'received' 
                  ? rating.rater?.friendly_name 
                  : rating.rated_player?.friendly_name}
              </td>
              <td>{formatRating(rating.attack_rating)}</td>
              <td>{formatRating(rating.defense_rating)}</td>
              <td>{formatRating(rating.game_iq_rating)}</td>
              <td>{formatDate(rating.updated_at || rating.created_at)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
