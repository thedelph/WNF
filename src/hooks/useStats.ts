import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { PlayerStats } from '../types/player'

interface UseStatsResult {
  playerStats: PlayerStats[]
  isLoading: boolean
  error: string | null
}

export const useStats = (): UseStatsResult => {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check authentication first
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError) throw new Error('Authentication error: ' + authError.message)
        if (!session) throw new Error('No active session - please log in')

        // Fetch player stats
        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select(`
            id,
            user_id,
            friendly_name,
            caps,
            active_bonuses,
            active_penalties,
            win_rate,
            attack_rating,
            defense_rating,
            avatar_svg,
            avatar_options,
            current_streak,
            max_streak
          `)

        if (statsError) {
          console.error('Stats error:', statsError)
          throw new Error('Failed to fetch stats: ' + statsError.message)
        }

        if (!statsData) {
          throw new Error('No stats data returned')
        }

        // Transform stats data
        const transformedStats: PlayerStats[] = statsData.map(stat => ({
          id: stat.id,
          userId: stat.user_id,
          friendlyName: stat.friendly_name,
          caps: stat.caps || 0,
          activeBonuses: stat.active_bonuses || 0,
          activePenalties: stat.active_penalties || 0,
          currentStreak: stat.current_streak || 0,
          maxStreak: stat.max_streak || 0,
          winRate: stat.win_rate || 0,
          attackRating: stat.attack_rating || 0,
          defenseRating: stat.defense_rating || 0,
          avatarSvg: stat.avatar_svg || '',
          avatarOptions: stat.avatar_options || {},
          // Set these to 0 since they're not in the view
          dropoutPenalties: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          gamesPlayed: stat.caps || 0 // Using caps as games played
        }))

        setPlayerStats(transformedStats)
      } catch (err) {
        console.error('Error in useStats:', err)
        setError(err instanceof Error ? err.message : 'An error occurred while fetching stats')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { playerStats, isLoading, error }
}
