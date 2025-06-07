'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GameCard from './GameCard'
import GameFilters from './GameFilters'
import { Game } from '../../../../types/game'
import PlayerFilter from './PlayerFilter'
import { supabase } from '../../../../utils/supabase'
import { toast } from 'react-toastify'

interface Props {
  games: Game[]
  loading: boolean
  onGameDeleted: () => void
  recalculateAllCaps: () => Promise<void>
}

interface Filters {
  dateFrom: string
  dateTo: string
  hasScore: 'all' | 'yes' | 'no'
  playerId: string | null
}

const HistoricalGameList: React.FC<Props> = ({ games, loading, onGameDeleted, recalculateAllCaps }) => {
  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    hasScore: 'all',
    playerId: null
  })

  useEffect(() => {
    if (games.length > 0) {
      recalculateAllCaps()
    }
  }, [games.length])

  const filteredGames = games.filter(game => {
    if (filters.dateFrom && new Date(game.date) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(game.date) > new Date(filters.dateTo)) return false
    if (filters.hasScore === 'yes' && (game.score_blue === null || game.score_orange === null)) return false
    if (filters.hasScore === 'no' && game.score_blue !== null && game.score_orange !== null) return false
    if (filters.playerId) {
      const playerInGame = game.game_registrations?.some(
        reg => reg.player_id === filters.playerId
      )
      if (!playerInGame) return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <GameFilters filters={filters} onFiltersChange={setFilters} />
      
      <div className="mt-8 space-y-6">
        <AnimatePresence>
          {filteredGames.map((game) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GameCard game={game} onGameDeleted={onGameDeleted} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {filteredGames.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-gray-500 mt-8"
        >
          No games found matching the current filters.
        </motion.p>
      )}
    </motion.div>
  )
}

export default HistoricalGameList