'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAdmin } from '../../../hooks/useAdmin'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Game } from '../../../types/game'

type GameOutcome = 'blue_win' | 'orange_win' | 'draw' | null;

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
        .or('status.eq.teams_announced,and(status.eq.completed,completed.eq.false)')
        .gt('created_at', '2023-11-15')
        .lte('date', new Date().toISOString()) // Only show games where kickoff time has passed
        .order('date', { ascending: false })

      if (pendingError) throw pendingError
      setPendingGames(pendingData)

      // Fetch historical games
      const { data: historicalData, error: historicalError } = await supabaseAdmin
        .from('games')
        .select(`
          id,
          date,
          status,
          sequence_number,
          score_blue,
          score_orange,
          outcome,
          venue:venue_id (
            id,
            name,
            address,
            google_maps_url
          ),
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
        console.log(`Calculating caps for ${player.friendly_name}...`);
        
        // Get all games that should count towards caps
        const { data: games, error: gamesError } = await supabaseAdmin
          .from('game_registrations')
          .select(`
            id,
            games!inner (
              id,
              date,
              completed,
              is_historical,
              status
            )
          `)
          .eq('player_id', player.id)
          .eq('status', 'selected')
          .eq('games.completed', true)
          .lt('games.date', new Date().toISOString());

        if (gamesError) {
          console.error(`Error getting games for player ${player.friendly_name}:`, gamesError);
          continue;
        }

        // Log each game being counted
        if (games) {
          console.log(`Games being counted for ${player.friendly_name}:`);
          games.forEach(game => {
            console.log(`Game ${game.games.id}: date=${game.games.date}, completed=${game.games.completed}, status=${game.games.status}`);
          });
        }

        const count = games?.length || 0;
        console.log(`Found ${count} games for ${player.friendly_name}`);

        // Only update if we have a valid count
        if (typeof count === 'number') {
          const { error: updateError } = await supabaseAdmin
            .from('players')
            .update({ caps: count })
            .eq('id', player.id);

          if (updateError) {
            console.error(`Error updating caps for player ${player.friendly_name}:`, updateError);
            continue;
          }

          console.log(`Successfully updated caps for ${player.friendly_name} to ${count}`);
        }
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
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Add Historical Game</h2>
              <HistoricalGameForm onGameAdded={fetchGames} />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Import Historical Games</h2>
              <CSVImport onGamesImported={fetchGames} />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
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