import React from 'react';
import { motion } from 'framer-motion';
import { FilterConfig } from './types';
import { FaTimes } from 'react-icons/fa';

interface FilterPanelProps {
  filterConfig: FilterConfig;
  onFilterChange: (config: FilterConfig) => void;
  onClose: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filterConfig,
  onFilterChange,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-base-200 p-4 rounded-lg shadow-lg"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button onClick={onClose} className="btn btn-ghost btn-circle">
          <FaTimes />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Attack Rating Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              max="10"
              value={filterConfig.minAttack}
              onChange={(e) => onFilterChange({ ...filterConfig, minAttack: Number(e.target.value) })}
              className="input input-bordered w-full"
            />
            <span className="self-center">to</span>
            <input
              type="number"
              min="0"
              max="10"
              value={filterConfig.maxAttack}
              onChange={(e) => onFilterChange({ ...filterConfig, maxAttack: Number(e.target.value) })}
              className="input input-bordered w-full"
            />
          </div>
        </div>
        
        <div>
          <label className="label">Defense Rating Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              max="10"
              value={filterConfig.minDefense}
              onChange={(e) => onFilterChange({ ...filterConfig, minDefense: Number(e.target.value) })}
              className="input input-bordered w-full"
            />
            <span className="self-center">to</span>
            <input
              type="number"
              min="0"
              max="10"
              value={filterConfig.maxDefense}
              onChange={(e) => onFilterChange({ ...filterConfig, maxDefense: Number(e.target.value) })}
              className="input input-bordered w-full"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <label className="label">Minimum Total Ratings</label>
        <input
          type="number"
          min="0"
          value={filterConfig.minTotalRatings}
          onChange={(e) => onFilterChange({ ...filterConfig, minTotalRatings: Number(e.target.value) })}
          className="input input-bordered w-full"
        />
      </div>
    </motion.div>
  );
};
