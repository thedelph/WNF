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
      <table className="table table-xs sm:table-sm md:table-md w-full">
        <thead>
          <tr>
            <th onClick={() => onSort('friendly_name')} className="cursor-pointer">
              {mode === 'received' ? 'Rater' : 'Player'}
            </th>
            <th className="hidden sm:table-cell" onClick={() => onSort('attack_rating')} >
              <span className="cursor-pointer">Attack</span>
            </th>
            <th className="hidden sm:table-cell" onClick={() => onSort('defense_rating')} >
              <span className="cursor-pointer">Defense</span>
            </th>
            <th className="hidden sm:table-cell" onClick={() => onSort('game_iq_rating')} >
              <span className="cursor-pointer">Game IQ</span>
            </th>
            <th className="sm:hidden">Ratings</th>
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
              <td className="font-medium">
                {mode === 'received' 
                  ? rating.rater?.friendly_name 
                  : rating.rated_player?.friendly_name}
              </td>
              <td className="hidden sm:table-cell">{formatRating(rating.attack_rating)}</td>
              <td className="hidden sm:table-cell">{formatRating(rating.defense_rating)}</td>
              <td className="hidden sm:table-cell">{formatRating(rating.game_iq_rating)}</td>
              <td className="sm:hidden">
                <div className="flex flex-col gap-1">
                  <span className="badge badge-xs">A: {formatRating(rating.attack_rating)}</span>
                  <span className="badge badge-xs">D: {formatRating(rating.defense_rating)}</span>
                  <span className="badge badge-xs">IQ: {formatRating(rating.game_iq_rating)}</span>
                </div>
              </td>
              <td className="text-xs sm:text-sm">
                <div className="hidden sm:block">
                  {formatDate(rating.updated_at || rating.created_at)}
                </div>
                <div className="sm:hidden">
                  {new Date(rating.updated_at || rating.created_at).toLocaleDateString()}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
