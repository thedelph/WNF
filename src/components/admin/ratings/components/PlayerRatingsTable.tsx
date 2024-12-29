import React from 'react';
import { motion } from 'framer-motion';
import { Player, Rating, SortConfig } from './types';
import { formatDate } from '../../../../utils/dateUtils';

interface PlayerRatingsTableProps {
  ratings: Rating[];
  sortConfig: SortConfig;
  onSort: (key: SortConfig['key']) => void;
}

export const PlayerRatingsTable: React.FC<PlayerRatingsTableProps> = ({
  ratings,
  sortConfig,
  onSort,
}) => {
  // Sort ratings based on current configuration
  const sortedRatings = [...ratings].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    if (sortConfig.key === 'friendly_name') {
      return direction * a.rater.friendly_name.localeCompare(b.rater.friendly_name);
    }
    return direction * ((a[sortConfig.key] || 0) - (b[sortConfig.key] || 0));
  });

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th onClick={() => onSort('friendly_name')} className="cursor-pointer">
              Rater Name
            </th>
            <th onClick={() => onSort('attack_rating')} className="cursor-pointer">
              Attack Rating
            </th>
            <th onClick={() => onSort('defense_rating')} className="cursor-pointer">
              Defense Rating
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
              <td>{rating.rater.friendly_name}</td>
              <td>{rating.attack_rating}</td>
              <td>{rating.defense_rating}</td>
              <td>{formatDate(rating.created_at)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
