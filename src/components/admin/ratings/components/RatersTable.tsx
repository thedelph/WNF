import React from 'react';
import { motion } from 'framer-motion';
import { Player, SortConfig } from '../types';
import { FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import { formatRating } from '../../../../utils/ratingFormatters';

interface RatersTableProps {
  raters: Player[];
  sortConfig: SortConfig;
  onSort: (key: SortConfig['key']) => void;
  onRaterSelect: (raterId: string) => void;
  selectedRaterId: string | null;
}

export const RatersTable: React.FC<RatersTableProps> = ({
  raters,
  sortConfig,
  onSort,
  onRaterSelect,
  selectedRaterId,
}) => {
  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />;
  };

  // Sort raters based on current configuration
  const sortedRaters = [...raters].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    if (sortConfig.key === 'friendly_name') {
      return direction * a.friendly_name.localeCompare(b.friendly_name);
    }
    if (sortConfig.key === 'total_ratings') {
      return direction * ((a.ratings_given?.length || 0) - (b.ratings_given?.length || 0));
    }
    return direction * ((a[sortConfig.key] || 0) - (b[sortConfig.key] || 0));
  });

  return (
    <div className="overflow-x-auto">
      <table className="table table-xs sm:table-sm md:table-md w-full">
        <thead>
          <tr>
            <th onClick={() => onSort('friendly_name')} className="cursor-pointer">
              <span className="flex items-center gap-1">
                <span className="hidden sm:inline">Rater Name</span>
                <span className="sm:hidden">Rater</span>
                {getSortIcon('friendly_name')}
              </span>
            </th>
            <th onClick={() => onSort('total_ratings')} className="cursor-pointer">
              <span className="flex items-center gap-1">
                <span className="hidden sm:inline">Ratings Given</span>
                <span className="sm:hidden">Given</span>
                {getSortIcon('total_ratings')}
              </span>
            </th>
            <th className="hidden sm:table-cell">
              <span className="hidden md:inline">Average Attack</span>
              <span className="md:hidden">Avg A</span>
            </th>
            <th className="hidden sm:table-cell">
              <span className="hidden md:inline">Average Defense</span>
              <span className="md:hidden">Avg D</span>
            </th>
            <th className="hidden md:table-cell">
              <span className="hidden lg:inline">Average Game IQ</span>
              <span className="lg:hidden">Avg IQ</span>
            </th>
            <th className="hidden lg:table-cell">
              <span>Avg GK</span>
            </th>
            <th className="sm:hidden">Averages</th>
          </tr>
        </thead>
        <tbody>
          {sortedRaters.map((rater) => {
            const avgAttack = rater.ratings_given?.reduce((sum, r) => sum + r.attack_rating, 0) / (rater.ratings_given?.length || 1);
            const avgDefense = rater.ratings_given?.reduce((sum, r) => sum + r.defense_rating, 0) / (rater.ratings_given?.length || 1);
            const avgGameIq = rater.ratings_given?.reduce((sum, r) => sum + r.game_iq_rating, 0) / (rater.ratings_given?.length || 1);
            const avgGk = rater.ratings_given?.reduce((sum, r) => sum + r.gk_rating, 0) / (rater.ratings_given?.length || 1);

            return (
              <motion.tr
                key={rater.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`hover cursor-pointer ${
                  selectedRaterId === rater.id ? 'bg-primary bg-opacity-20' : ''
                }`}
                onClick={() => onRaterSelect(rater.id)}
              >
                <td className="font-medium">{rater.friendly_name}</td>
                <td>{rater.ratings_given?.length || 0}</td>
                <td className="hidden sm:table-cell">{formatRating(rater.ratings_given?.length ? avgAttack : null)}</td>
                <td className="hidden sm:table-cell">{formatRating(rater.ratings_given?.length ? avgDefense : null)}</td>
                <td className="hidden md:table-cell">{formatRating(rater.ratings_given?.length ? avgGameIq : null)}</td>
                <td className="hidden lg:table-cell">{formatRating(rater.ratings_given?.length ? avgGk : null)}</td>
                <td className="sm:hidden">
                  <div className="flex flex-col gap-1">
                    <span className="badge badge-xs">A: {formatRating(rater.ratings_given?.length ? avgAttack : null)}</span>
                    <span className="badge badge-xs">D: {formatRating(rater.ratings_given?.length ? avgDefense : null)}</span>
                    <span className="badge badge-xs">IQ: {formatRating(rater.ratings_given?.length ? avgGameIq : null)}</span>
                    <span className="badge badge-xs">GK: {formatRating(rater.ratings_given?.length ? avgGk : null)}</span>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
