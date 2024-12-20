import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { Player, PlayerDBResponse, transformPlayerFromDB } from '../types/player'
import { Game, GameDBResponse, transformGameFromDB } from '../types/game'

interface UseGamePlayersResult {
  players: Player[]
  game: Game | null
  isLoading: boolean
  error: string | null
  selectedPlayers: Player[]
  reservePlayers: Player[]
  droppedOutPlayers: Player[]
  gameDate: Date | null
  firstDropoutTime: Date | null
  refreshPlayers: () => Promise<void>
  gameData: Game | null
  activeSlotOffers: {
    id: string
    status: 'pending' | 'accepted' | 'declined'
    created_at: string
  }[]
}

/**
 * Custom hook to manage game players data and state
 * Handles fetching and organizing player data for a specific game
 */
export const useGamePlayers = (gameId: string): UseGamePlayersResult => {
  const [players, setPlayers] = useState<Player[]>([])
  const [game, setGame] = useState<Game | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGameAndPlayers = async () => {
    try {
      setIsLoading(true)

      // Fetch game details
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

      if (gameError) throw gameError

<<<<<<< HEAD
      // Transform game data
      const transformedGame = transformGameFromDB(gameData as GameDBResponse)
      setGame(transformedGame)
=======
      // Get first dropout time
      const { data: dropoutData, error: dropoutError } = await supabase
        .from('game_registrations')
        .select('created_at')
        .eq('game_id', gameId)
        .eq('status', 'dropped_out')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
>>>>>>> parent of 69d0f2c (updates)

      // Fetch players in the game
      const { data: playersData, error: playersError } = await supabase
        .from('game_players')
        .select(`
          player:player_id (*)
        `)
        .eq('game_id', gameId)

      if (playersError) throw playersError

      // Transform player data
      const transformedPlayers = playersData.map(data => 
        transformPlayerFromDB(data.player as PlayerDBResponse)
      )
      setPlayers(transformedPlayers)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching game players')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (gameId) {
      fetchGameAndPlayers()
    }
  }, [gameId])

  return { 
    players, 
    game, 
    isLoading, 
    error, 
    selectedPlayers: [], 
    reservePlayers: [], 
    droppedOutPlayers: [], 
    gameDate: null, 
    firstDropoutTime: null, 
    refreshPlayers: async () => {}, 
    gameData: null, 
    activeSlotOffers: [] 
  }
}
