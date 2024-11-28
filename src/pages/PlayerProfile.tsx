import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../utils/supabase'
import { toast } from 'react-hot-toast'
import { calculatePlayerXP } from '../utils/xpCalculations'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'

interface GameHistory {
  game_id: string
  team: 'Blue' | 'Orange'
  paid: boolean
  games: {
    date: string
    outcome: 'win' | 'loss' | 'draw' | null
    score_blue: number
    score_orange: number
  }
  date: string
  outcome: 'win' | 'loss' | 'draw' | null
  score_blue: number
  score_orange: number
}

interface PlayerStats {
  id: string
  friendly_name: string
  xp?: number
  caps?: number
  preferred_position: string
  active_bonuses?: number
  active_penalties?: number
  win_rate?: number
  attack_rating?: number
  defense_rating?: number
  avatar_svg?: string
  current_streak: number
  max_streak: number
  games_played_together?: number
  my_rating?: {
    attack_rating: number
    defense_rating: number
  }
}

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerStats | null>(null)
  const [games, setGames] = useState<GameHistory[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratings, setRatings] = useState<{ attack: number; defense: number }>({
    attack: 0,
    defense: 0,
  })

  // Sorting and filtering states
  const [sortConfig, setSortConfig] = useState<{ key: keyof GameHistory['games'] | 'team', direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  })
  const [filters, setFilters] = useState({
    dateRange: {
      start: null as Date | null,
      end: null as Date | null
    },
    team: '' as '' | 'Blue' | 'Orange',
    outcome: '' as '' | 'Won' | 'Lost' | 'Draw' | 'Unknown'
  })

  // Sort and filter functions
  const sortAndFilterGames = (games: GameHistory[]) => {
    let filteredGames = [...games].filter(game => game && game.games); // Filter out null/undefined games

    // Apply filters
    if (filters.dateRange.start || filters.dateRange.end) {
      filteredGames = filteredGames.filter(game => {
        if (!game.games?.date) return false;
        const gameDate = new Date(game.games.date);
        const afterStart = !filters.dateRange.start || gameDate >= filters.dateRange.start;
        const beforeEnd = !filters.dateRange.end || gameDate <= filters.dateRange.end;
        return afterStart && beforeEnd;
      });
    }

    if (filters.team) {
      filteredGames = filteredGames.filter(game => 
        game.team && game.team.toLowerCase() === filters.team.toLowerCase()
      );
    }

    if (filters.outcome) {
      filteredGames = filteredGames.filter(game => {
        const outcome = getGameOutcome(game);
        return outcome === filters.outcome;
      });
    }

    // Apply sorting
    filteredGames.sort((a, b) => {
      if (sortConfig.key === 'date') {
        if (!a.games?.date || !b.games?.date) return 0;
        const dateA = new Date(a.games.date).getTime();
        const dateB = new Date(b.games.date).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortConfig.key === 'team') {
        if (!a.team || !b.team) return 0;
        return sortConfig.direction === 'asc'
          ? a.team.localeCompare(b.team)
          : b.team.localeCompare(a.team);
      }
      return 0;
    });

    return filteredGames;
  }

  const getGameOutcome = (game: GameHistory): string => {
    if (!game?.games?.outcome) return 'Unknown';
    if (game.games.outcome === 'draw') return 'Draw';
    if (!game?.team) return 'Unknown';
    
    const team = game.team.toLowerCase();
    const isWin = (team === 'blue' && game.games.outcome === 'blue_win') ||
                 (team === 'orange' && game.games.outcome === 'orange_win');
    return isWin ? 'Won' : 'Lost';
  }

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }

  // Filter components
  const FilterHeader = () => (
    <div className="flex flex-wrap gap-4 mb-4 p-4 bg-base-200 rounded-lg">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Date Range</span>
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            className="input input-bordered input-sm"
            onChange={(e) => setFilters(prev => ({
              ...prev,
              dateRange: { ...prev.dateRange, start: e.target.value ? new Date(e.target.value) : null }
            }))}
          />
          <input
            type="date"
            className="input input-bordered input-sm"
            onChange={(e) => setFilters(prev => ({
              ...prev,
              dateRange: { ...prev.dateRange, end: e.target.value ? new Date(e.target.value) : null }
            }))}
          />
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Team</span>
        </label>
        <select
          className="select select-bordered select-sm"
          value={filters.team}
          onChange={(e) => setFilters(prev => ({ ...prev, team: e.target.value as typeof filters.team }))}
        >
          <option value="">All Teams</option>
          <option value="Blue">Blue</option>
          <option value="Orange">Orange</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Outcome</span>
        </label>
        <select
          className="select select-bordered select-sm"
          value={filters.outcome}
          onChange={(e) => setFilters(prev => ({ ...prev, outcome: e.target.value as typeof filters.outcome }))}
        >
          <option value="">All Outcomes</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
          <option value="Draw">Draw</option>
          <option value="Unknown">Unknown</option>
        </select>
      </div>

      <div className="form-control self-end">
        <button
          className="btn btn-sm"
          onClick={() => setFilters({
            dateRange: { start: null, end: null },
            team: '',
            outcome: ''
          })}
        >
          Reset Filters
        </button>
      </div>
    </div>
  )

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        // First fetch player data
        const { data: playerData, error: playerError } = await supabase
          .from('player_stats')
          .select('*')
          .eq('id', id)
          .single()

        if (playerError) throw playerError

        // If user is logged in, get games played together and rating
        if (user?.id) {
          // First get the current player's ID from the players table
          const { data: currentPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('user_id', user.id)
            .single()

          if (currentPlayer) {
            // Get games played together
            const { data: gamesCount } = await supabase
              .rpc('get_players_with_game_count', {
                current_player_id: currentPlayer.id
              })
              .eq('id', id)
              .single()

            // Get rating if exists
            const { data: myRating } = await supabase
              .from('player_ratings')
              .select('attack_rating, defense_rating')
              .eq('rater_id', currentPlayer.id)
              .eq('rated_player_id', id)
              .single()

            playerData.games_played_together = gamesCount?.games_played || 0
            playerData.my_rating = myRating
          }
        }

        // Fetch games with proper ordering
        const { data: gamesData, error: gamesError } = await supabase
          .from('game_registrations')
          .select(`
            game_id,
            team,
            paid,
            games (
              date,
              outcome,
              score_blue,
              score_orange
            )
          `)
          .eq('player_id', id)
          .order('date', { foreignTable: 'games', ascending: false })

        if (gamesError) {
          console.error('Games fetch error:', gamesError)
          throw gamesError
        }

        // Transform the data to match the GameHistory interface
        const processedGames: GameHistory[] = gamesData
          .filter(game => game && game.games) // Make sure both game and game.games exist
          .map(game => ({
            game_id: game.game_id,
            team: game.team,
            paid: game.paid,
            games: {
              date: game.games?.date || '',
              outcome: game.games?.outcome || null,
              score_blue: game.games?.score_blue || 0,
              score_orange: game.games?.score_orange || 0
            },
            date: game.games?.date || '',
            outcome: game.games?.outcome || null,
            score_blue: game.games?.score_blue || 0,
            score_orange: game.games?.score_orange || 0
          }))

        // Calculate win rate
        const gamesWithKnownOutcome = processedGames.filter(game => 
          game.games?.outcome !== null
        );
        
        const wins = gamesWithKnownOutcome.filter(game => {
          const team = game.team.toLowerCase();
          return (team === 'blue' && game.games.outcome === 'blue_win') ||
                 (team === 'orange' && game.games.outcome === 'orange_win');
        });

        const winRate = gamesWithKnownOutcome.length > 0 
          ? Number(((wins.length / gamesWithKnownOutcome.length) * 100).toFixed(1))
          : 0;

        // Update player data with calculated win rate
        const updatedPlayerData = {
          ...playerData,
          win_rate: winRate
        };
        setPlayer(updatedPlayerData);
        setGames(processedGames)

      } catch (error) {
        console.error('Error fetching player data:', error)
        toast.error('Failed to load player profile')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchPlayerData()
    }
  }, [id])

  const handleRatingSubmit = async () => {
    if (!user?.id || !id) return

    try {
      // Get current player's ID
      const { data: currentPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!currentPlayer) {
        toast.error('Could not find your player profile')
        return
      }

      const { error } = await supabase
        .from('player_ratings')
        .upsert(
          {
            rater_id: currentPlayer.id,
            rated_player_id: id,
            attack_rating: ratings.attack,
            defense_rating: ratings.defense
          },
          {
            onConflict: 'rater_id,rated_player_id',
            ignoreDuplicates: false
          }
        )

      if (error) throw error

      toast.success(`Successfully rated ${player?.friendly_name}`)
      setShowRatingModal(false)
      fetchPlayerData() // Refresh player data
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Player not found</h2>
        </div>
      </div>
    )
  }

  const stats = [
    { 
      label: 'XP', 
      value: (() => {
        const xpValue = calculatePlayerXP({
          caps: player.caps ?? 0,
          activeBonuses: player.active_bonuses ?? 0,
          activePenalties: player.active_penalties ?? 0,
          currentStreak: player.current_streak ?? 0
        });
        console.log('XP Calculation:', {
          caps: player.caps,
          activeBonuses: player.active_bonuses,
          activePenalties: player.active_penalties,
          currentStreak: player.current_streak,
          calculatedXP: xpValue
        });
        return xpValue.toString();
      })()
    },
    { 
      label: 'Caps', 
      value: player.caps ?? 'N/A' 
    },
    { 
      label: 'Win Rate', 
      value: player.win_rate ? `${player.win_rate}%` : 'N/A' 
    },
    { 
      label: 'Current Streak', 
      value: Number(player.current_streak) || 0 
    },
    { 
      label: 'Best Streak', 
      value: Number(player.max_streak) || 0 
    },
    { 
      label: 'Active Bonuses', 
      value: player.active_bonuses ?? 'N/A' 
    },
    { 
      label: 'Active Penalties', 
      value: player.active_penalties ?? 'N/A' 
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container mx-auto px-4 py-8"
    >
      {/* Player Header */}
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        className="bg-base-200 rounded-xl p-6 mb-8 shadow-lg"
      >
        <div className="flex items-center gap-6">
          <img
            src={player.avatar_svg || '/default-avatar.svg'}
            alt={player.friendly_name}
            className="w-24 h-24 rounded-full"
          />
          <div>
            <h1 className="text-3xl font-bold">{player.friendly_name}</h1>
            <p className="text-xl">{player.preferred_position}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-base-100 rounded-lg p-4 shadow-lg">
            <h2 className="text-2xl font-bold mb-2">{stat.label}</h2>
            <p className="text-xl">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Rating Section - Only visible to logged-in users viewing other players */}
      {user && user.id !== id && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-base-100 shadow-xl mt-4"
        >
          <div className="card-body">
            <h2 className="card-title">Player Rating</h2>
            
            {player?.games_played_together !== undefined && (
              <>
                {player.games_played_together >= 5 ? (
                  <div className="space-y-4">
                    {player.my_rating && (
                      <div className="text-sm text-gray-600">
                        <p>Your Current Ratings:</p>
                        <p>Attack: {player.my_rating.attack_rating / 2} stars</p>
                        <p>Defense: {player.my_rating.defense_rating / 2} stars</p>
                      </div>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-primary"
                      onClick={() => {
                        setRatings({
                          attack: player.my_rating?.attack_rating || 0,
                          defense: player.my_rating?.defense_rating || 0
                        })
                        setShowRatingModal(true)
                      }}
                    >
                      {player.my_rating ? 'Update Rating' : 'Rate Player'}
                    </motion.button>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    You need to play {5 - player.games_played_together} more games with this player to rate them
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-white rounded-lg p-6 max-w-md w-full space-y-4"
          >
            <h2 className="text-xl font-semibold">
              Rate {player?.friendly_name}
            </h2>
            
            <div className="space-y-4">
              <StarRating
                rating={ratings.attack}
                onChange={(value) => setRatings(prev => ({ ...prev, attack: value }))}
                label="Attack Rating"
              />
              <StarRating
                rating={ratings.defense}
                onChange={(value) => setRatings(prev => ({ ...prev, defense: value }))}
                label="Defense Rating"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-ghost"
                onClick={() => setShowRatingModal(false)}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary"
                onClick={handleRatingSubmit}
              >
                Submit Rating
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Game History */}
      <div className="bg-base-100 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Game History</h2>
        <FilterHeader />
        {games.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th onClick={() => handleSort('date')} className="cursor-pointer hover:bg-base-200">
                    Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('team')} className="cursor-pointer hover:bg-base-200">
                    Team {sortConfig.key === 'team' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Outcome</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sortAndFilterGames(games).map((game) => {
                    const outcome = getGameOutcome(game);

                    return (
                      <motion.tr 
                        key={game.game_id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`${
                          outcome === 'Won' ? 'bg-success/10 hover:bg-success/20' :
                          outcome === 'Lost' ? 'bg-error/10 hover:bg-error/20' :
                          'hover:bg-base-200'
                        } transition-colors duration-200`}
                      >
                        <td>{new Date(game.games.date).toLocaleDateString()}</td>
                        <td>
                          <div className={`badge badge-sm font-medium ${
                            !game.team ? 'badge-ghost opacity-50' :
                            game.team?.toLowerCase() === 'blue' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {game.team ? game.team.charAt(0).toUpperCase() + game.team.slice(1) : 'Unknown'}
                          </div>
                        </td>
                        <td>
                          <div className={`badge badge-sm font-medium ${
                            outcome === 'Won' ? 'badge-success' :
                            outcome === 'Lost' ? 'badge-error' :
                            outcome === 'Draw' ? 'badge-primary' :
                            'badge-ghost opacity-50'
                          }`}>
                            {outcome}
                          </div>
                        </td>
                        <td>
                          {game.games.score_blue !== null && game.games.score_orange !== null ? (
                            <div className="flex gap-2 items-center">
                              <div className={`badge badge-sm font-medium ${
                                !game.team ? 'badge-ghost' :
                                game.team?.toLowerCase() === 'blue' ? 'badge-info' : 'badge-warning'
                              }`}>
                                {!game.team ? '?' : 
                                 game.team?.toLowerCase() === 'blue' ? game.games.score_blue : game.games.score_orange}
                              </div>
                              <span>-</span>
                              <div className={`badge badge-sm font-medium ${
                                !game.team ? 'badge-ghost' :
                                game.team?.toLowerCase() === 'blue' ? 'badge-warning' : 'badge-info'
                              }`}>
                                {!game.team ? '?' :
                                 game.team?.toLowerCase() === 'blue' ? game.games.score_orange : game.games.score_blue}
                              </div>
                            </div>
                          ) : (
                            <div className="badge badge-sm badge-ghost opacity-50 font-medium">
                              Unknown
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-4">No games found</p>
        )}
      </div>
    </motion.div>
  )
}
