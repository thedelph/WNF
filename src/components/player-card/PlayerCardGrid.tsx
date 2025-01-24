import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayerCard } from './PlayerCard'
import { usePlayerGrid } from '../../hooks/usePlayerGrid'
import { toast } from 'react-hot-toast'

interface Player {
  id: string
  friendlyName: string
  caps: number
  preferredPosition: string
  activeBonuses: number
  activePenalties: number
  winRate: number
  currentStreak: number
  maxStreak: number
  benchWarmerStreak: number
  xp: number
  avatarSvg?: string
  rarity?: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary'
  wins: number
  draws: number
  losses: number
  totalGames: number
  streakBonus: number
  dropoutPenalty: number
  bonusModifier: number
  penaltyModifier: number
  totalModifier: number
  whatsapp_group_member?: string
  rank: number
  unpaidGames?: number
  unpaidGamesModifier?: number
  registrationStreakBonus?: number
  registrationStreakBonusApplies?: boolean
}

interface PlayerStats {
  [id: string]: {
    xp: number
    rarity: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary'
    caps: number
    activeBonuses: number
    activePenalties: number
    currentStreak: number
    maxStreak: number
    wins: number
    draws: number
    losses: number
    totalGames: number
    winRate: number
    rank: number | undefined
    unpaidGames: number
    unpaidGamesModifier: number
    registrationStreakBonus: number
    registrationStreakBonusApplies: boolean
  }
}

export default function PlayerCardGrid() {
  const { players, loading, setPlayers } = usePlayerGrid();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Player;
    direction: 'asc' | 'desc';
  }>({ key: 'xp', direction: 'desc' })
  const [filterBy, setFilterBy] = useState('')
  const [whatsAppMembersOnly, setWhatsAppMembersOnly] = useState(true)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    minCaps: '',
    maxCaps: '',
    minWinRate: '',
    maxWinRate: '',
    minStreak: '',
    maxStreak: '',
    rarity: ''
  })

  const sortedAndFilteredPlayers = players
    .filter(player => {
      // Text search filter (only friendly name)
      const searchTerm = filterBy.toLowerCase();
      const name = player.friendlyName?.toLowerCase() || '';
      const nameMatch = name.includes(searchTerm);

      // Numeric range filters
      const capsInRange = (filters.minCaps === '' || player.caps >= Number(filters.minCaps)) &&
                         (filters.maxCaps === '' || player.caps <= Number(filters.maxCaps));
      
      const winRateInRange = (filters.minWinRate === '' || player.winRate >= Number(filters.minWinRate)) &&
                            (filters.maxWinRate === '' || player.winRate <= Number(filters.maxWinRate));
      
      const streakInRange = (filters.minStreak === '' || player.currentStreak >= Number(filters.minStreak)) &&
                           (filters.maxStreak === '' || player.currentStreak <= Number(filters.maxStreak));

      // Rarity filter
      const rarityMatch = !filters.rarity || player.rarity === filters.rarity;

      // WhatsApp members filter
      const whatsAppMatch = !whatsAppMembersOnly || (player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy');

      return nameMatch && capsInRange && winRateInRange && streakInRange && rarityMatch && whatsAppMatch;
    })
    .sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      // Special handling for numeric fields
      if (sortConfig.key === 'winRate' || sortConfig.key === 'xp' || 
          sortConfig.key === 'caps' || sortConfig.key === 'currentStreak') {
        return (Number(a[sortConfig.key] || 0) - Number(b[sortConfig.key] || 0)) * direction;
      }
      
      // Default string comparison for other fields
      if (a[sortConfig.key] < b[sortConfig.key]) return -1 * direction;
      if (a[sortConfig.key] > b[sortConfig.key]) return 1 * direction;
      return 0;
    });

  const handleSort = (key: keyof Player) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="container mx-auto px-4">
      <div className="mb-6 space-y-4">
        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="text"
            placeholder="Search by name..."
            className="input input-bordered w-full max-w-xs"
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
          />
          
          {/* Collapse toggle for filters */}
          <div className="w-full sm:w-auto">
            <motion.div 
              className="collapse bg-base-200 rounded-box"
              animate={{ boxShadow: isFiltersOpen ? "0 4px 6px -1px rgb(0 0 0 / 0.1)" : "none" }}
              transition={{ duration: 0.2 }}
            >
              <input 
                type="checkbox" 
                className="peer" 
                checked={isFiltersOpen}
                onChange={(e) => setIsFiltersOpen(e.target.checked)}
              /> 
              <motion.div 
                className="collapse-title text-sm font-medium peer-checked:bg-base-300 flex items-center justify-between"
                animate={{ 
                  backgroundColor: isFiltersOpen ? "hsl(var(--b3))" : "transparent"
                }}
                transition={{ duration: 0.2 }}
              >
                <span>Advanced Filters</span>
                <motion.div
                  animate={{ 
                    rotate: isFiltersOpen ? 180 : 0,
                    color: isFiltersOpen ? "hsl(var(--p))" : "currentColor"
                  }}
                  transition={{ duration: 0.2 }}
                >
                  ▼
                </motion.div>
              </motion.div>
              <motion.div 
                className="collapse-content peer-checked:bg-base-300"
                initial={false}
                animate={{ 
                  height: isFiltersOpen ? "auto" : 0,
                  opacity: isFiltersOpen ? 1 : 0
                }}
                transition={{ 
                  height: { duration: 0.3 },
                  opacity: { duration: 0.2 }
                }}
              >
                {/* Filters */}
                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ 
                    y: isFiltersOpen ? 0 : -20,
                    opacity: isFiltersOpen ? 1 : 0
                  }}
                  transition={{ 
                    delay: 0.1,
                    duration: 0.3
                  }}
                >
                  {/* Caps Range */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Caps Range</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="input input-bordered input-sm w-24"
                        value={filters.minCaps}
                        onChange={(e) => setFilters(prev => ({ ...prev, minCaps: e.target.value }))}

                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="input input-bordered input-sm w-24"
                        value={filters.maxCaps}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxCaps: e.target.value }))}

                      />
                    </div>
                  </div>

                  {/* Win Rate Range */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Win Rate Range (%)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="input input-bordered input-sm w-24"
                        value={filters.minWinRate}
                        onChange={(e) => setFilters(prev => ({ ...prev, minWinRate: e.target.value }))}

                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="input input-bordered input-sm w-24"
                        value={filters.maxWinRate}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxWinRate: e.target.value }))}

                      />
                    </div>
                  </div>

                  {/* Streak Range */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Streak Range</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="input input-bordered input-sm w-24"
                        value={filters.minStreak}
                        onChange={(e) => setFilters(prev => ({ ...prev, minStreak: e.target.value }))}

                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="input input-bordered input-sm w-24"
                        value={filters.maxStreak}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxStreak: e.target.value }))}

                      />
                    </div>
                  </div>

                  {/* Rarity Filter */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Rarity</span>
                    </label>
                    <select
                      className="select select-bordered select-sm"
                      value={filters.rarity}
                      onChange={(e) => setFilters(prev => ({ ...prev, rarity: e.target.value }))}

                    >
                      <option value="">All Rarities</option>
                      <option value="Amateur">Amateur</option>
                      <option value="Semi Pro">Semi Pro</option>
                      <option value="Professional">Professional</option>
                      <option value="World Class">World Class</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>

                  {/* WhatsApp Members Filter */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">WhatsApp Members Only</span>
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={whatsAppMembersOnly}
                        onChange={(e) => setWhatsAppMembersOnly(e.target.checked)}

                      />
                    </div>
                  </div>
                </motion.div>

                {/* Sort Controls */}
                <motion.div 
                  className="flex flex-wrap gap-2 mt-4"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ 
                    y: isFiltersOpen ? 0 : -20,
                    opacity: isFiltersOpen ? 1 : 0
                  }}
                  transition={{ 
                    delay: 0.2,
                    duration: 0.3
                  }}
                >
                  <button
                    className={`btn btn-sm ${sortConfig.key === 'xp' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleSort('xp')}

                  >
                    XP {sortConfig.key === 'xp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}

                  </button>
                  <button
                    className={`btn btn-sm ${sortConfig.key === 'caps' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleSort('caps')}

                  >
                    Caps {sortConfig.key === 'caps' && (sortConfig.direction === 'asc' ? '↑' : '↓')}

                  </button>
                  <button
                    className={`btn btn-sm ${sortConfig.key === 'winRate' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleSort('winRate')}

                  >
                    Win Rate {sortConfig.key === 'winRate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}

                  </button>
                  <button
                    className={`btn btn-sm ${sortConfig.key === 'currentStreak' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleSort('currentStreak')}

                  >
                    Streak {sortConfig.key === 'currentStreak' && (sortConfig.direction === 'asc' ? '↑' : '↓')}

                  </button>
                  <button
                    className={`btn btn-sm ${sortConfig.key === 'friendlyName' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleSort('friendlyName')}

                  >
                    Name {sortConfig.key === 'friendlyName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}

                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6 justify-items-center sm:justify-items-stretch"
            layout
          >
            <AnimatePresence>
              {sortedAndFilteredPlayers.map((player) => (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <PlayerCard
                    id={player.id}
                    friendlyName={player.friendlyName}
                    caps={player.caps}
                    activeBonuses={player.activeBonuses}
                    activePenalties={player.activePenalties}
                    winRate={player.winRate}
                    currentStreak={player.currentStreak}
                    maxStreak={player.maxStreak}
                    benchWarmerStreak={player.benchWarmerStreak}
                    avatarSvg={player.avatarSvg}
                    rarity={player.rarity}
                    wins={player.wins}
                    draws={player.draws}
                    losses={player.losses}
                    whatsapp_group_member={player.whatsapp_group_member}
                    isRandomlySelected={player.isRandomlySelected}
                    rank={player.rank}
                    xp={player.xp}
                    totalGames={player.totalGames}
                    unpaidGames={player.unpaidGames}
                    unpaidGamesModifier={player.unpaidGamesModifier}
                    registrationStreakBonus={player.registrationStreakBonus}
                    registrationStreakBonusApplies={player.registrationStreakBonusApplies}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}