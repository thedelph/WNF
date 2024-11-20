import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../utils/supabase'
import { toast } from 'react-hot-toast'

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
}

interface GameHistory {
  game_id: string
  team: 'Blue' | 'Orange'
  paid: boolean
  payment_link: string | null
  games: {
    date: string
    outcome: 'win' | 'loss' | 'draw' | null
  }
}

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerStats | null>(null)
  const [games, setGames] = useState<GameHistory[]>([])
  const [loading, setLoading] = useState(true)

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

        setPlayer(playerData)

        // Fetch games with proper ordering
        const { data: gamesData, error: gamesError } = await supabase
          .from('game_registrations')
          .select(`
            game_id,
            team,
            paid,
            payment_link,
            games (
              date,
              outcome
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
          .filter(game => game.games)
          .map(game => ({
            game_id: game.game_id,
            team: game.team,
            paid: game.paid,
            payment_link: game.payment_link,
            games: {
              date: game.games.date,
              outcome: game.games.outcome
            }
          }))

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
      value: player.xp?.toFixed(1) ?? 'N/A' 
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
      label: 'Attack Rating', 
      value: player.attack_rating?.toFixed(1) ?? 'N/A' 
    },
    { 
      label: 'Defense Rating', 
      value: player.defense_rating?.toFixed(1) ?? 'N/A' 
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

      {/* Game History */}
      <div className="bg-base-100 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Game History</h2>
        {games.length > 0 ? (
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Team</th>
                <th>Outcome</th>
                <th>Paid</th>
                <th>Payment Link</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.game_id}>
                  <td>{new Date(game.games.date).toLocaleDateString()}</td>
                  <td>{game.team}</td>
                  <td>{game.games.outcome || 'Unknown'}</td>
                  <td>{game.paid ? 'Yes' : 'No'}</td>
                  <td>
                    {game.payment_link ? (
                      <a href={game.payment_link} target="_blank" rel="noopener noreferrer" className="link">
                        Pay Now
                      </a>
                    ) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center py-4">No games found</p>
        )}
      </div>

      {/* Streak Stats */}
      <div className="stats shadow">
        <div className="stat">
          <div className="stat-title">Current Streak</div>
          <div className="stat-value">{Number(player.current_streak) || 0}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Best Streak</div>
          <div className="stat-value">{Number(player.max_streak) || 0}</div>
        </div>
      </div>
    </motion.div>
  )
}
