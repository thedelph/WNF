import React from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { PlayerCardProps } from '../PlayerCardTypes';
import { Tooltip } from '../../ui/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';

interface FiltersProps {
  filters: {
    minCaps: string;
    maxCaps: string;
    minWinRate: string;
    maxWinRate: string;
    minStreak: string;
    maxStreak: string;
    rarity: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    minCaps: string;
    maxCaps: string;
    minWinRate: string;
    maxWinRate: string;
    minStreak: string;
    maxStreak: string;
    rarity: string;
  }>>;
  filterBy: string;
  setFilterBy: React.Dispatch<React.SetStateAction<string>>;
  whatsAppMembersOnly: boolean;
  setWhatsAppMembersOnly: React.Dispatch<React.SetStateAction<boolean>>;
  hideZeroXpPlayers: boolean;
  setHideZeroXpPlayers: React.Dispatch<React.SetStateAction<boolean>>;
  isFiltersOpen: boolean;
  setIsFiltersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sortConfig: { key: keyof PlayerCardProps; direction: 'asc' | 'desc' };
  setSortConfig: React.Dispatch<React.SetStateAction<{ key: keyof PlayerCardProps; direction: 'asc' | 'desc' }>>;
}

/**
 * Component for filtering player grid data
 * Includes filters for caps, win rate, streak, rarity, and WhatsApp membership
 */
export const PlayerGridFilters: React.FC<FiltersProps> = ({
  filters,
  setFilters,
  filterBy,
  setFilterBy,
  whatsAppMembersOnly,
  setWhatsAppMembersOnly,
  hideZeroXpPlayers,
  setHideZeroXpPlayers,
  isFiltersOpen,
  setIsFiltersOpen,
  sortConfig,
  setSortConfig,
}) => {
  const handleSort = (key: keyof PlayerCardProps) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortButtonClass = (key: keyof PlayerCardProps) => {
    return `btn btn-sm ${sortConfig.key === key ? 'btn-primary' : 'btn-ghost'}`;
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search input */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search players..."
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="input input-bordered w-full"
          />
        </div>

        {/* Filters toggle button */}
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className={`btn ${isFiltersOpen ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Filter className="w-5 h-5" />
          <span className="ml-2">Advanced Sorting/Filtering</span>
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${isFiltersOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Advanced filters */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-base-200 rounded-lg p-4 space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Filter by</h3>
                
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer label">
                    <span className="label-text mr-2">WhatsApp Members Only</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={whatsAppMembersOnly}
                      onChange={(e) => setWhatsAppMembersOnly(e.target.checked)}
                    />
                  </label>
                  
                  <label className="cursor-pointer label">
                    <span className="label-text mr-2">Hide Retired Players</span>
                    <Tooltip content="Hide inactive players with 0 XP">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={hideZeroXpPlayers}
                        onChange={(e) => setHideZeroXpPlayers(e.target.checked)}
                      />
                    </Tooltip>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Caps range */}
                  <div className="space-y-2">
                    <label className="label">Caps Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minCaps}
                        onChange={(e) => setFilters({ ...filters, minCaps: e.target.value })}
                        className="input input-bordered w-full"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxCaps}
                        onChange={(e) => setFilters({ ...filters, maxCaps: e.target.value })}
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>

                  {/* Win rate range */}
                  <div className="space-y-2">
                    <label className="label">Win Rate Range (%)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minWinRate}
                        onChange={(e) => setFilters({ ...filters, minWinRate: e.target.value })}
                        className="input input-bordered w-full"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxWinRate}
                        onChange={(e) => setFilters({ ...filters, maxWinRate: e.target.value })}
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>

                  {/* Streak range */}
                  <div className="space-y-2">
                    <label className="label">Streak Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minStreak}
                        onChange={(e) => setFilters({ ...filters, minStreak: e.target.value })}
                        className="input input-bordered w-full"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxStreak}
                        onChange={(e) => setFilters({ ...filters, maxStreak: e.target.value })}
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>

                  {/* Rarity filter */}
                  <div className="space-y-2">
                    <label className="label">Rarity</label>
                    <select
                      value={filters.rarity}
                      onChange={(e) => setFilters({ ...filters, rarity: e.target.value })}
                      className="select select-bordered w-full"
                    >
                      <option value="">All</option>
                      <option value="Amateur">Amateur</option>
                      <option value="Semi Pro">Semi Pro</option>
                      <option value="Professional">Professional</option>
                      <option value="World Class">World Class</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>
                </div>

                <div className="divider"></div>

                <h3 className="text-lg font-semibold">Sort by</h3>
                {/* Sort buttons */}
                <div className="flex flex-wrap gap-2">
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
                    onClick={() => handleSort('friendlyName')}
                    className={getSortButtonClass('friendlyName')}
                  >
                    Name {sortConfig.key === 'friendlyName' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
