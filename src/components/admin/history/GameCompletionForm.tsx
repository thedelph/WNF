import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Game } from '../../../types/game'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Player } from '../../../types/player'
import { format } from 'date-fns'

interface Props {
  game: Game
  onComplete: () => void
}

const GameCompletionForm: React.FC<Props> = ({ game, onComplete }) => {
  const [scoreBlue, setScoreBlue] = useState<number | undefined>(game.score_blue)
  const [scoreOrange, setScoreOrange] = useState<number | undefined>(game.score_orange)
  const [outcome, setOutcome] = useState<string | undefined>(game.outcome)
  const [paymentLink, setPaymentLink] = useState<string>(game.payment_link || '')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRegisteredPlayers()
  }, [])

  const fetchRegisteredPlayers = async () => {
    try {
      const { data: registrations, error } = await supabaseAdmin
        .from('game_registrations')
        .select(`
          player_id,
          players:player_id (
            id,
            friendly_name
          )
        `)
        .eq('game_id', game.id)

      if (error) throw error

      const players = registrations
        .map(reg => reg.players)
        .filter(player => player !== null) as Player[]

      setRegisteredPlayers(players)
      setSelectedPlayers(players.map(p => p.id))
    } catch (error) {
      console.error('Error fetching registered players:', error)
      toast.error('Failed to fetch registered players')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scoreBlue || !scoreOrange || !outcome) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)

      // Update game with completion details
      const { error: gameError } = await supabaseAdmin
        .from('games')
        .update({
          score_blue: scoreBlue,
          score_orange: scoreOrange,
          outcome,
          payment_link: paymentLink,
          needs_completion: false,
          is_historical: true
        })
        .eq('id', game.id)

      if (gameError) throw gameError

      // Update player selections
      const { error: selectionsError } = await supabaseAdmin
        .from('game_selections')
        .upsert(
          selectedPlayers.map(playerId => ({
            game_id: game.id,
            player_id: playerId
          }))
        )

      if (selectionsError) throw selectionsError

      toast.success('Game completed successfully')
      onComplete()
    } catch (error) {
      console.error('Error completing game:', error)
      toast.error('Failed to complete game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Complete Game Details</h3>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Game #{game.sequence_number || 'N/A'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {format(new Date(game.date), 'EEEE do MMMM yyyy')} at {format(new Date(game.date), 'h:mma')}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Blue Score</label>
            <input
              type="number"
              value={scoreBlue || ''}
              onChange={e => setScoreBlue(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Orange Score</label>
            <input
              type="number"
              value={scoreOrange || ''}
              onChange={e => setScoreOrange(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Outcome</label>
          <select
            value={outcome || ''}
            onChange={e => setOutcome(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select outcome...</option>
            <option value="blue_win">Blue Win</option>
            <option value="orange_win">Orange Win</option>
            <option value="draw">Draw</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Payment Link</label>
          <input
            type="url"
            value={paymentLink}
            onChange={e => setPaymentLink(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="https://monzo.me/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Verify Players</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {registeredPlayers.map(player => (
              <label key={player.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedPlayers([...selectedPlayers, player.id])
                    } else {
                      setSelectedPlayers(selectedPlayers.filter(id => id !== player.id))
                    }
                  }}
                  className="form-checkbox"
                />
                <span>{player.friendly_name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Completing...' : 'Complete Game'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default GameCompletionForm
