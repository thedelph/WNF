import React from 'react';
import { motion } from 'framer-motion';
import { Player, SortConfig } from '../types';
import { FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';

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
      <table className="table w-full">
        <thead>
          <tr>
            <th onClick={() => onSort('friendly_name')} className="cursor-pointer">
              Rater Name {getSortIcon('friendly_name')}
            </th>
            <th onClick={() => onSort('total_ratings')} className="cursor-pointer">
              Ratings Given {getSortIcon('total_ratings')}
            </th>
            <th>Average Attack</th>
            <th>Average Defense</th>
          </tr>
        </thead>
        <tbody>
          {sortedRaters.map((rater) => {
            const avgAttack = rater.ratings_given?.reduce((sum, r) => sum + r.attack_rating, 0) / (rater.ratings_given?.length || 1);
            const avgDefense = rater.ratings_given?.reduce((sum, r) => sum + r.defense_rating, 0) / (rater.ratings_given?.length || 1);
            
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
                <td>{rater.friendly_name}</td>
                <td>{rater.ratings_given?.length || 0}</td>
                <td>{avgAttack.toFixed(1)}</td>
                <td>{avgDefense.toFixed(1)}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
