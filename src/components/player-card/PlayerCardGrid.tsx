import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayerCard } from './PlayerCard'
import { supabase } from '../../utils/supabase'
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
  }
}

export default function PlayerCardGrid() {
  const [players, setPlayers] = useState<Player[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats>({})
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true)
        // Fetch players with their stats and rank
        const { data: players, error } = await supabase
          .from('players')
          .select(`
            id,
            friendly_name,
            avatar_svg,
            whatsapp_group_member
          `)
          .order('friendly_name')

        if (error) {
          throw error
        }

        if (players) {
          setPlayers(players.map((player) => ({
            id: player.id,
            friendlyName: player.friendly_name,
            avatarSvg: player.avatar_svg,
            whatsapp_group_member: player.whatsapp_group_member,
            caps: 0,
            xp: 0,
            activeBonuses: 0,
            activePenalties: 0,
            currentStreak: 0,
            maxStreak: 0,
            winRate: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            totalGames: 0,
            preferredPosition: '',
            benchWarmerStreak: 0,
            streakBonus: 0,
            dropoutPenalty: 0,
            bonusModifier: 0,
            penaltyModifier: 0,
            totalModifier: 0,
            rank: undefined
          })))
        }
      } catch (error) {
        console.error('Error fetching players:', error)
        toast.error('Failed to load players')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  useEffect(() => {
    const fetchPlayerStats = async (playerIds: string[]) => {
      try {
        setLoading(true);

        // Get player stats and XP data
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select(`
            id,
            caps,
            current_streak,
            max_streak,
            active_bonuses,
            active_penalties,
            win_rate,
            player_xp (
              xp,
              rank,
              rarity
            )
          `)
          .in('id', playerIds);

        if (playerError) throw playerError;

        // Get win rates and game stats
        const { data: winRateData, error: winRateError } = await supabase
          .rpc('get_player_win_rates')
          .in('id', playerIds);

        if (winRateError) throw winRateError;

        // Create a map of win rate data for easy lookup
        const winRateMap = winRateData.reduce((acc: any, player: any) => ({
          ...acc,
          [player.id]: {
            wins: player.wins,
            draws: player.draws,
            losses: player.losses,
            totalGames: player.total_games,
            winRate: player.win_rate
          }
        }), {});

        // Transform into record for easy lookup
        const stats = playerData?.reduce((acc, player) => ({
          ...acc,
          [player.id]: {
            xp: player.player_xp?.xp || 0,
            rarity: player.player_xp?.rarity || 'Amateur',
            caps: player.caps || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            maxStreak: player.max_streak || 0,
            wins: winRateMap[player.id]?.wins || 0,
            draws: winRateMap[player.id]?.draws || 0,
            losses: winRateMap[player.id]?.losses || 0,
            totalGames: winRateMap[player.id]?.totalGames || 0,
            winRate: winRateMap[player.id]?.winRate || 0,
            rank: player.player_xp?.rank || undefined
          }
        }), {});

        setPlayerStats(stats);
      } catch (err) {
        console.error('Error fetching player stats:', err);
        toast.error('Failed to load player stats');
      } finally {
        setLoading(false);
      }
    };

    if (players.length > 0) {
      const playerIds = players.map(player => player.id);
      fetchPlayerStats(playerIds);
    }
  }, [players]);

  const sortedAndFilteredPlayers = players
    .filter(player => {
      // Text search filter (only friendly name)
      const searchTerm = filterBy.toLowerCase();
      const name = player.friendlyName?.toLowerCase() || '';
      const nameMatch = name.includes(searchTerm);

      // Numeric range filters
      const capsInRange = (filters.minCaps === '' || playerStats[player.id]?.caps >= Number(filters.minCaps)) &&
                         (filters.maxCaps === '' || playerStats[player.id]?.caps <= Number(filters.maxCaps));
      
      const winRateInRange = (filters.minWinRate === '' || playerStats[player.id]?.winRate >= Number(filters.minWinRate)) &&
                            (filters.maxWinRate === '' || playerStats[player.id]?.winRate <= Number(filters.maxWinRate));
      
      const streakInRange = (filters.minStreak === '' || playerStats[player.id]?.currentStreak >= Number(filters.minStreak)) &&
                           (filters.maxStreak === '' || playerStats[player.id]?.currentStreak <= Number(filters.maxStreak));

      // Rarity filter
      const rarityMatch = !filters.rarity || playerStats[player.id]?.rarity === filters.rarity;

      // WhatsApp members filter
      const whatsAppMatch = !whatsAppMembersOnly || (player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy');

      return nameMatch && capsInRange && winRateInRange && streakInRange && rarityMatch && whatsAppMatch;
    })
    .sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      // Special handling for numeric fields
      if (sortConfig.key === 'winRate' || sortConfig.key === 'xp' || 
          sortConfig.key === 'caps' || sortConfig.key === 'currentStreak') {
        return (Number(playerStats[a.id]?.[sortConfig.key] || 0) - Number(playerStats[b.id]?.[sortConfig.key] || 0)) * direction;
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
                    xp={playerStats[player.id]?.xp || 0}
                    caps={playerStats[player.id]?.caps || 0}
                    activeBonuses={playerStats[player.id]?.activeBonuses || 0}
                    activePenalties={playerStats[player.id]?.activePenalties || 0}
                    winRate={playerStats[player.id]?.winRate || 0}
                    wins={playerStats[player.id]?.wins || 0}
                    draws={playerStats[player.id]?.draws || 0}
                    losses={playerStats[player.id]?.losses || 0}
                    totalGames={playerStats[player.id]?.totalGames || 0}
                    currentStreak={playerStats[player.id]?.currentStreak || 0}
                    maxStreak={playerStats[player.id]?.maxStreak || 0}
                    benchWarmerStreak={0}
                    rarity={playerStats[player.id]?.rarity || 'Amateur'}
                    avatarSvg={player.avatarSvg}
                    whatsapp_group_member={player.whatsapp_group_member}
                    rank={playerStats[player.id]?.rank || undefined}
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