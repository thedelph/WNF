import React from 'react';
import { motion } from 'framer-motion';
import { FilterConfig } from '../types';
import { FaTimes } from 'react-icons/fa';
import { Position } from '../../../../types/positions';
import { POSITION_CONFIGS } from '../../../../constants/positions';

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
              className="input w-full"
            />
            <span className="self-center">to</span>
            <input
              type="number"
              min="0"
              max="10"
              value={filterConfig.maxAttack}
              onChange={(e) => onFilterChange({ ...filterConfig, maxAttack: Number(e.target.value) })}
              className="input w-full"
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
              className="input w-full"
            />
            <span className="self-center">to</span>
            <input
              type="number"
              min="0"
              max="10"
              value={filterConfig.maxDefense}
              onChange={(e) => onFilterChange({ ...filterConfig, maxDefense: Number(e.target.value) })}
              className="input w-full"
            />
          </div>
        </div>
        
        <div>
          <label className="label">Game IQ Rating Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              max="10"
              value={filterConfig.minGameIq}
              onChange={(e) => onFilterChange({ ...filterConfig, minGameIq: Number(e.target.value) })}
              className="input w-full"
            />
            <span className="self-center">to</span>
            <input
              type="number"
              min="0"
              max="10"
              value={filterConfig.maxGameIq}
              onChange={(e) => onFilterChange({ ...filterConfig, maxGameIq: Number(e.target.value) })}
              className="input w-full"
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="label">
          <span className="label-text font-medium">Filter by Position Consensus</span>
          {filterConfig.selectedPositions.length > 0 && (
            <button
              onClick={() => onFilterChange({ ...filterConfig, selectedPositions: [] })}
              className="label-text-alt underline hover:text-primary"
            >
              Clear ({filterConfig.selectedPositions.length})
            </button>
          )}
        </label>
        <div className="bg-base-100 p-3 rounded-lg space-y-3">
          {/* Defense */}
          <div>
            <div className="text-xs font-medium mb-1 flex items-center gap-1">
              🛡️ Defense
            </div>
            <div className="flex flex-wrap gap-2">
              {POSITION_CONFIGS.filter(p => p.category === 'defense').map(pos => (
                <label key={pos.code} className="cursor-pointer flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={filterConfig.selectedPositions.includes(pos.code)}
                    onChange={(e) => {
                      const newPositions = e.target.checked
                        ? [...filterConfig.selectedPositions, pos.code]
                        : filterConfig.selectedPositions.filter(p => p !== pos.code);
                      onFilterChange({ ...filterConfig, selectedPositions: newPositions });
                    }}
                  />
                  <span className="text-xs">{pos.code}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Midfield */}
          <div>
            <div className="text-xs font-medium mb-1 flex items-center gap-1">
              ⚙️ Midfield
            </div>
            <div className="flex flex-wrap gap-2">
              {POSITION_CONFIGS.filter(p => p.category === 'midfield').map(pos => (
                <label key={pos.code} className="cursor-pointer flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={filterConfig.selectedPositions.includes(pos.code)}
                    onChange={(e) => {
                      const newPositions = e.target.checked
                        ? [...filterConfig.selectedPositions, pos.code]
                        : filterConfig.selectedPositions.filter(p => p !== pos.code);
                      onFilterChange({ ...filterConfig, selectedPositions: newPositions });
                    }}
                  />
                  <span className="text-xs">{pos.code}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Attack */}
          <div>
            <div className="text-xs font-medium mb-1 flex items-center gap-1">
              ⚔️ Attack
            </div>
            <div className="flex flex-wrap gap-2">
              {POSITION_CONFIGS.filter(p => p.category === 'attack').map(pos => (
                <label key={pos.code} className="cursor-pointer flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={filterConfig.selectedPositions.includes(pos.code)}
                    onChange={(e) => {
                      const newPositions = e.target.checked
                        ? [...filterConfig.selectedPositions, pos.code]
                        : filterConfig.selectedPositions.filter(p => p !== pos.code);
                      onFilterChange({ ...filterConfig, selectedPositions: newPositions });
                    }}
                  />
                  <span className="text-xs">{pos.code}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="text-xs text-base-content/60 mt-2">
            Filters players by their primary positions (≥50% consensus)
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
          className="input w-full"
        />
      </div>
    </motion.div>
  );
};
