import React from 'react'
import { Trophy, Swords, ListChecks } from 'lucide-react'
import { PlayerCardStatsProps } from './PlayerCardTypes'

/**
 * Displays player statistics including win rate, W/D/L record, and total games
 */
export const PlayerCardStats: React.FC<PlayerCardStatsProps> = ({
  winRate,
  wins,
  draws,
  losses,
  totalGames,
  shieldActive = false,
  frozenStreakValue = null,
}) => {
  return (
    <div className="rounded-lg p-4 w-full space-y-2 bg-black/30">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          <span>Win Rate</span>
        </div>
        {totalGames >= 10 ? (
          <span className="font-bold">{winRate.toFixed(1)}%</span>
        ) : (
          <span className="text-xs opacity-70">More Data Needed ({totalGames}/10)</span>
        )}
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4" />
          <span>W/D/L</span>
        </div>
        <span className="font-bold">{wins} / {draws} / {losses}</span>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4" />
          <span>Total Games</span>
        </div>
        <span className="font-bold">{totalGames}</span>
      </div>
    </div>
  )
}
