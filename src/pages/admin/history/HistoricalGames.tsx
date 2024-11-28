'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAdmin } from '../../../hooks/useAdmin'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Game } from '../../../types/game'
import HistoricalGameForm from '../../../components/admin/history/HistoricalGameForm'
import CSVImport from '../../../components/admin/history/csv/CSVImport'
import HistoricalGameList from '../../../components/admin/history/list/HistoricalGameList'
import GameCompletionForm from '../../../components/admin/history/GameCompletionForm'

export default function HistoricalGames() {
  const [games, setGames] = useState<Game[]>([])
  const [pendingGames, setPendingGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const { isAdmin } = useAdmin()
  const [outcome, setOutcome] = useState<GameOutcome>(null)
  const [isRecalculating, setIsRecalculating] = useState(false)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      setLoading(true)
      
      // Fetch games that need completion (only for games created after 2023-11-15)
      const { data: pendingData, error: pendingError } = await supabaseAdmin
        .from('games')
        .select(`
          *,
          game_registrations (
            id,
            team,
            player_id,
            players:player_id (
              id,
              friendly_name
            )
          )
        `)
        .eq('needs_completion', true)
        .gt('created_at', '2023-11-15')
        .order('date', { ascending: false })

      if (pendingError) throw pendingError
      setPendingGames(pendingData)

      // Fetch historical games
      const { data: historicalData, error: historicalError } = await supabaseAdmin
        .from('games')
        .select(`
          *,
          game_registrations (
            id,
            team,
            player_id,
            players:player_id (
              id,
              friendly_name
            )
          )
        `)
        .eq('is_historical', true)
        .order('date', { ascending: false })

      if (historicalError) throw historicalError
      setGames(historicalData)
    } catch (error) {
      console.error('Error fetching games:', error)
      toast.error('Failed to fetch games')
    } finally {
      setLoading(false)
    }
  }

  const handleGameComplete = () => {
    fetchGames()
  }

  const recalculateAllCaps = async () => {
    try {
      setIsRecalculating(true)
      
      // First, get all players
      const { data: players, error: playersError } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name')

      if (playersError) throw playersError

      // For each player, count their game registrations
      for (const player of players) {
        const { count, error: countError } = await supabaseAdmin
          .from('game_registrations')
          .select('*', { count: 'exact', head: false })
          .eq('player_id', player.id)
          .eq('status', 'selected')

        if (countError) {
          console.error(`Error counting games for player ${player.friendly_name}:`, countError)
          continue
        }

        // Update player's caps with the counted value
        const { error: updateError } = await supabaseAdmin
          .from('players')
          .update({ caps: count })
          .eq('id', player.id)

        if (updateError) {
          console.error(`Error updating caps for player ${player.friendly_name}:`, updateError)
          continue
        }

        console.log(`Updated caps for ${player.friendly_name} to ${count}`)
      }

      toast.success('Successfully recalculated all player caps')
    } catch (error) {
      console.error('Error recalculating caps:', error)
      toast.error('Failed to recalculate caps')
    } finally {
      setIsRecalculating(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-semibold text-error">Access Denied</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8"
    >
      <h1 className="text-3xl font-bold mb-8">Historical Games</h1>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {pendingGames.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Games Needing Completion</h2>
              {pendingGames.map(game => (
                <GameCompletionForm 
                  key={game.id} 
                  game={game} 
                  onComplete={handleGameComplete} 
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Add Historical Game</h2>
              <HistoricalGameForm onGameAdded={fetchGames} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Import Historical Games</h2>
              <CSVImport onGamesImported={fetchGames} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Historical Games List</h2>
              <HistoricalGameList
                games={games}
                loading={loading}
                onGameDeleted={fetchGames}
                recalculateAllCaps={recalculateAllCaps}
              />
            </div>
          </div>
        </>
      )}
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={recalculateAllCaps}
          disabled={isRecalculating}
          className={`btn btn-secondary ${isRecalculating ? 'loading' : ''}`}
        >
          {isRecalculating ? 'Recalculating...' : 'Recalculate All Caps'}
        </button>
      </div>
    </motion.div>
  )
}