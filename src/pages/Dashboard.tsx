import React from 'react'
import { StatsCard } from '../components/dashboard/StatsCard'
import { useStats } from '../hooks/useStats'
import { Trophy, Medal, Target, Zap } from 'lucide-react'
import { calculatePlayerXP } from '../utils/xpCalculations'
import { PlayerStats } from '../types/player'

interface Stats {
  playerStats: PlayerStats[]
  isLoading: boolean
  error: string | null
}

export const Dashboard: React.FC = () => {
  const { playerStats, isLoading, error } = useStats()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  const totalXP = playerStats.reduce((total, stats) => {
    return total + calculatePlayerXP(stats)
  }, 0)

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">WNF Stats</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total XP"
          value={totalXP}
          icon={<Trophy className="w-6 h-6" />}
          description="Total XP earned across all players"
          color="teal"
          stats={playerStats}
        />
        <StatsCard
          title="Active Players"
          value={playerStats.length}
          icon={<Medal className="w-6 h-6" />}
          description="Number of active players"
          color="blue"
        />
        <StatsCard
          title="Average Win Rate"
          value={`${(playerStats.reduce((total, stats) => total + (stats.winRate || 0), 0) / playerStats.length).toFixed(1)}%`}
          icon={<Target className="w-6 h-6" />}
          description="Average win rate across all players"
          color="orange"
        />
        <StatsCard
          title="Total Games"
          value={playerStats.reduce((total, stats) => total + (stats.caps || 0), 0)}
          icon={<Zap className="w-6 h-6" />}
          description="Total games played"
          color="purple"
        />
      </div>
    </div>
  )
}
