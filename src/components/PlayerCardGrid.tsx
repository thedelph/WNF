import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PlayerCard from './PlayerCard'
import { supabase } from '../utils/supabase'
import { toast } from 'react-hot-toast'
import { calculateRarity } from '../utils/rarityCalculations'

interface Player {
  id: string
  friendlyName: string
  xp?: number
  caps: number
  preferredPosition: string | null
  activeBonuses: number
  activePenalties: number
  winRate: number
  currentStreak: number
  maxStreak: number
  rarity?: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary'
  avatarSvg?: string
}

export default function PlayerCardGrid() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Player;
    direction: 'asc' | 'desc';
  }>({ key: 'xp', direction: 'desc' })
  const [filterBy, setFilterBy] = useState('')
  const [filters, setFilters] = useState({
    minCaps: '',
    maxCaps: '',
    minWinRate: '',
    maxWinRate: '',
    minStreak: '',
    maxStreak: '',
    rarity: ''
  })

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      
      // Get all players with their XP directly from player_stats view
      const { data: playersData, error } = await supabase
        .from('player_stats')
        .select('*')
        .order('xp', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Player interface
      const playersWithRarity = playersData.map(player => ({
        id: player.id,
        friendlyName: player.friendly_name,
        caps: player.caps || 0,
        preferredPosition: player.preferred_position || '',
        activeBonuses: player.active_bonuses || 0,
        activePenalties: player.active_penalties || 0,
        winRate: player.win_rate || 0,
        currentStreak: player.current_streak || 0,
        maxStreak: player.max_streak || 0,
        xp: player.xp || 0,
        avatarSvg: player.avatar_svg || '',
        rarity: calculateRarity(player.xp || 0, playersData.map(p => p.xp || 0))
      }));

      setPlayers(playersWithRarity);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

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

      return nameMatch && capsInRange && winRateInRange && streakInRange && rarityMatch;
    })
    .sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      // Special handling for numeric fields
      if (sortConfig.key === 'winRate' || sortConfig.key === 'xp' || 
          sortConfig.key === 'caps' || sortConfig.key === 'currentStreak') {
        return (Number(a[sortConfig.key]) - Number(b[sortConfig.key])) * direction;
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
        <input
          type="text"
          placeholder="Search by name..."
          className="input input-bordered w-full max-w-xs"
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
        />

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap gap-2">
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
                <PlayerCard {...player} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}