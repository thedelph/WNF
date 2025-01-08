import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { supabaseAdmin } from '../../../../utils/supabase'
import { Notification } from '../../../../types/game'
import { GameCompletionFormProps, PlayerWithTeam } from './types'
import { ScoreInput } from './ScoreInput'
import { GameOutcome } from './GameOutcome'
import { TeamSection } from './TeamSection'

const GameCompletionForm: React.FC<GameCompletionFormProps> = ({ game, onComplete }) => {
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

      const playersWithTeam = teamData
        .filter(reg => reg.players)
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
            payment_verified_by: players[0]?.id // TODO: Replace with actual admin ID
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

      const selectedPlayers = players.filter(p => p.selected)
      
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

      const notifications: Notification[] = selectedPlayers.map(player => ({
        player_id: player.id,
        type: 'payment_request',
        title: 'Payment Required',
        message: `Payment required for game #${game.sequence_number}. Click the Monzo link to pay.`,
        action_url: paymentLink,
        icon: 'currency-pound',
        priority: 2,
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
          <ScoreInput
            label="Blue Score"
            value={scoreBlue}
            onChange={setScoreBlue}
          />
          <ScoreInput
            label="Orange Score"
            value={scoreOrange}
            onChange={setScoreOrange}
          />
        </div>

        <GameOutcome
          outcome={outcome}
          scoreBlue={scoreBlue}
          scoreOrange={scoreOrange}
          onChange={setOutcome}
          isValid={isOutcomeValid()}
        />

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
            <TeamSection
              players={players}
              teamColor="blue"
              onTeamChange={handleTeamChange}
              onPlayerSelection={handlePlayerSelection}
              onPaymentStatusChange={handlePaymentStatusChange}
            />
            <TeamSection
              players={players}
              teamColor="orange"
              onTeamChange={handleTeamChange}
              onPlayerSelection={handlePlayerSelection}
              onPaymentStatusChange={handlePaymentStatusChange}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
          >
            Complete Game
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default GameCompletionForm
