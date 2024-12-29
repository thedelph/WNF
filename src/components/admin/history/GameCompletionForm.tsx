import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Game, SelectedPlayer, NotificationType, Notification } from '../../../types/game'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Player } from '../../../types/player'
import { format } from 'date-fns'

interface Props {
  game: Game
  onComplete: () => void
}

interface PlayerWithTeam extends Player {
  team?: 'blue' | 'orange' | null
  selected?: boolean
  payment_status?: 'unpaid' | 'marked_paid' | 'admin_verified'
}

const GameCompletionForm: React.FC<Props> = ({ game, onComplete }) => {
  const [scoreBlue, setScoreBlue] = useState<number | undefined>(game.score_blue)
  const [scoreOrange, setScoreOrange] = useState<number | undefined>(game.score_orange)
  const [outcome, setOutcome] = useState<string | undefined>(game.outcome)
  const [paymentLink, setPaymentLink] = useState<string>(game.payment_link || '')
  const [players, setPlayers] = useState<PlayerWithTeam[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchGamePlayers()
  }, [])

  const fetchGamePlayers = async () => {
    try {
      // First get the team assignments
      const { data: teamData, error: teamError } = await supabaseAdmin
        .from('game_registrations')
        .select(`
          player_id,
          team,
          status,
          payment_status,
          players:player_id (
            id,
            friendly_name
          )
        `)
        .eq('game_id', game.id)

      if (teamError) throw teamError

      // Convert to PlayerWithTeam format
      const playersWithTeam = teamData
        .filter(reg => reg.players) // Filter out any null players
        .map(reg => ({
          ...reg.players,
          team: reg.team as 'blue' | 'orange' | null,
          selected: reg.status === 'selected',
          payment_status: reg.payment_status || 'unpaid'
        }))

      setPlayers(playersWithTeam)
    } catch (error) {
      console.error('Error fetching game players:', error)
      toast.error('Failed to fetch game players')
    }
  }

  const handleTeamChange = (playerId: string, team: 'blue' | 'orange' | null) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, team } : p
    ))
  }

  const handlePlayerSelection = (playerId: string, selected: boolean) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, selected } : p
    ))
  }

  const handlePaymentStatusChange = async (playerId: string, status: 'unpaid' | 'marked_paid' | 'admin_verified') => {
    try {
      const { error } = await supabaseAdmin
        .from('game_registrations')
        .update({
          payment_status: status,
          ...(status === 'admin_verified' ? {
            payment_verified_at: new Date().toISOString(),
            payment_verified_by: player?.id
          } : {})
        })
        .eq('game_id', game.id)
        .eq('player_id', playerId)

      if (error) throw error

      setPlayers(prev => prev.map(p => 
        p.id === playerId ? { ...p, payment_status: status } : p
      ))

      toast.success('Payment status updated')
    } catch (error) {
      console.error('Error updating payment status:', error)
      toast.error('Failed to update payment status')
    }
  }

  // Automatically determine outcome based on scores
  useEffect(() => {
    if (typeof scoreBlue === 'number' && typeof scoreOrange === 'number') {
      if (scoreBlue > scoreOrange) {
        setOutcome('blue_win')
      } else if (scoreOrange > scoreBlue) {
        setOutcome('orange_win')
      } else if (scoreBlue === scoreOrange) {
        setOutcome('draw')
      }
    }
  }, [scoreBlue, scoreOrange])

  // Calculate if outcome matches scores
  const isOutcomeValid = () => {
    if (typeof scoreBlue !== 'number' || typeof scoreOrange !== 'number') return true
    
    switch (outcome) {
      case 'blue_win':
        return scoreBlue > scoreOrange
      case 'orange_win':
        return scoreOrange > scoreBlue
      case 'draw':
        return scoreBlue === scoreOrange
      default:
        return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scoreBlue || !scoreOrange || !outcome || !paymentLink) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!isOutcomeValid()) {
      toast.error('Selected outcome does not match the scores')
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
          status: 'completed',
          needs_completion: false,
          completed: true
        })
        .eq('id', game.id)

      if (gameError) throw gameError

      // Update player selections and team assignments
      const selectedPlayers = players.filter(p => p.selected)
      
      // First, reset all players to unselected
      const { error: resetError } = await supabaseAdmin
        .from('game_registrations')
        .update({
          status: 'registered',
          selected: false,
          team: null,
          payment_status: 'unpaid'
        })
        .eq('game_id', game.id)

      if (resetError) throw resetError

      // Then update only the selected players
      for (const player of selectedPlayers) {
        const { error: updateError } = await supabaseAdmin
          .from('game_registrations')
          .update({
            status: 'selected',
            selected: true,
            team: player.team,
            payment_status: 'unpaid'
          })
          .eq('game_id', game.id)
          .eq('player_id', player.id)

        if (updateError) throw updateError
      }

      // Send payment notifications to selected players
      const notifications: Notification[] = selectedPlayers.map(player => ({
        player_id: player.id,
        type: 'payment_request',
        title: 'Payment Required',
        message: `Payment required for game #${game.sequence_number}. Click the Monzo link to pay.`,
        action_url: paymentLink,
        icon: 'currency-pound',
        priority: 2, // High priority for payment requests
        metadata: {
          game_id: game.id,
          payment_link: paymentLink,
          amount: game.cost_per_person || 5,
          action: 'payment_request'
        }
      }))

      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications)

      if (notificationError) throw notificationError

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
      className="bg-white p-6 rounded-lg shadow-lg mb-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Complete Game Details</h3>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            Game #{game.sequence_number || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            {format(new Date(game.date), 'EEEE do MMMM yyyy')} at {format(new Date(game.date), 'h:mma')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Blue Score</label>
            <input
              type="number"
              value={scoreBlue || ''}
              onChange={e => setScoreBlue(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
              min="0"
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
              min="0"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Outcome</label>
          <select
            value={outcome || ''}
            onChange={e => setOutcome(e.target.value)}
            className={`w-full p-2 border rounded ${!isOutcomeValid() ? 'border-error text-error' : ''}`}
            required
          >
            <option value="">Select outcome...</option>
            <option 
              value="blue_win" 
              disabled={typeof scoreBlue === 'number' && typeof scoreOrange === 'number' && scoreBlue <= scoreOrange}
            >
              Blue Win
            </option>
            <option 
              value="orange_win"
              disabled={typeof scoreBlue === 'number' && typeof scoreOrange === 'number' && scoreOrange <= scoreBlue}
            >
              Orange Win
            </option>
            <option 
              value="draw"
              disabled={typeof scoreBlue === 'number' && typeof scoreOrange === 'number' && scoreBlue !== scoreOrange}
            >
              Draw
            </option>
          </select>
          {!isOutcomeValid() && (
            <p className="text-error text-sm mt-1">
              Outcome does not match the scores
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Payment Link</label>
          <input
            type="url"
            value={paymentLink}
            onChange={e => setPaymentLink(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="https://monzo.me/..."
            required
          />
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Team Assignments</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Blue Team */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-medium text-blue-700 mb-3">
                Blue Team ({players.filter(p => p.team === 'blue').length})
              </h5>
              <div className="space-y-2">
                {players
                  .filter(p => p.team === 'blue' || !p.team)
                  .map(player => (
                    <div key={player.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={player.selected}
                          onChange={e => handlePlayerSelection(player.id, e.target.checked)}
                          className="checkbox checkbox-sm"
                        />
                        <span>{player.friendly_name}</span>
                      </div>
                      <select
                        value={player.team || ''}
                        onChange={e => handleTeamChange(player.id, e.target.value as 'blue' | 'orange' | null)}
                        className="select select-sm"
                      >
                        <option value="">No Team</option>
                        <option value="blue">Blue</option>
                        <option value="orange">Orange</option>
                      </select>
                      <select
                        value={player.payment_status || 'unpaid'}
                        onChange={e => handlePaymentStatusChange(player.id, e.target.value as 'unpaid' | 'marked_paid' | 'admin_verified')}
                        className="select select-sm"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="marked_paid">Marked Paid</option>
                        <option value="admin_verified">Admin Verified</option>
                      </select>
                    </div>
                  ))}
              </div>
            </div>

            {/* Orange Team */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <h5 className="font-medium text-orange-700 mb-3">
                Orange Team ({players.filter(p => p.team === 'orange').length})
              </h5>
              <div className="space-y-2">
                {players
                  .filter(p => p.team === 'orange' || !p.team)
                  .map(player => (
                    <div key={player.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={player.selected}
                          onChange={e => handlePlayerSelection(player.id, e.target.checked)}
                          className="checkbox checkbox-sm"
                        />
                        <span>{player.friendly_name}</span>
                      </div>
                      <select
                        value={player.team || ''}
                        onChange={e => handleTeamChange(player.id, e.target.value as 'blue' | 'orange' | null)}
                        className="select select-sm"
                      >
                        <option value="">No Team</option>
                        <option value="blue">Blue</option>
                        <option value="orange">Orange</option>
                      </select>
                      <select
                        value={player.payment_status || 'unpaid'}
                        onChange={e => handlePaymentStatusChange(player.id, e.target.value as 'unpaid' | 'marked_paid' | 'admin_verified')}
                        className="select select-sm"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="marked_paid">Marked Paid</option>
                        <option value="admin_verified">Admin Verified</option>
                      </select>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Completing...' : 'Complete Game'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default GameCompletionForm
