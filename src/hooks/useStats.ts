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

        // Fetch player stats
        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select(`
            id,
            caps,
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak,
            dropout_penalties,
            wins,
            draws,
            losses,
            games_played,
            average_attack,
            average_defense,
            win_rate
          `)

        if (statsError) throw statsError

        // Transform stats data
        const transformedStats: PlayerStats[] = statsData?.map(stat => ({
          id: stat.id,
          caps: stat.caps || 0,
          activeBonuses: stat.active_bonuses || 0,
          activePenalties: stat.active_penalties || 0,
          currentStreak: stat.current_streak || 0,
          maxStreak: stat.max_streak || 0,
          dropoutPenalties: stat.dropout_penalties || 0,
          wins: stat.wins || 0,
          draws: stat.draws || 0,
          losses: stat.losses || 0,
          gamesPlayed: stat.games_played || 0,
          averageAttack: stat.average_attack || 0,
          averageDefense: stat.average_defense || 0,
          winRate: stat.win_rate || 0
        })) || []

        setPlayerStats(transformedStats)
      } catch (err) {
        console.error('Error fetching stats:', err)
        setError(err instanceof Error ? err.message : 'An error occurred while fetching stats')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { playerStats, isLoading, error }
}
