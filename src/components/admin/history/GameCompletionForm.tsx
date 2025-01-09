import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { supabaseAdmin } from '../../../utils/supabase'
import { Notification } from '../../../types/game'
import { GameCompletionFormProps, PlayerWithTeam } from './types'
import { ScoreInput } from './ScoreInput'
import { GameOutcome } from './GameOutcome'
import { TeamSection } from './TeamSection'
import { PlayerSearch } from './PlayerSearch'

const GameCompletionForm: React.FC<GameCompletionFormProps> = ({ game, onComplete }) => {
  const [scoreBlue, setScoreBlue] = useState<number | undefined>(game.score_blue)
  const [scoreOrange, setScoreOrange] = useState<number | undefined>(game.score_orange)
  const [outcome, setOutcome] = useState<string | undefined>(game.outcome)
  const [paymentLink, setPaymentLink] = useState<string>(game.payment_link || '')
  const [players, setPlayers] = useState<PlayerWithTeam[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchGamePlayers()
  }, [game.id]) // Add game.id as dependency

  const fetchGamePlayers = async () => {
    setLoading(true)
    try {
      // First get the game registrations
      const { data: teamData, error: teamError } = await supabaseAdmin
        .from('game_registrations')
        .select(`
          player_id,
          team,
          status,
          payment_status
        `)
        .eq('game_id', game.id)

      if (teamError) throw teamError

      if (!teamData?.length) {
        setPlayers([])
        return
      }

      // Then get the player details
      const playerIds = teamData.map(reg => reg.player_id)
      const { data: playerData, error: playerError } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name')
        .in('id', playerIds)

      if (playerError) throw playerError

      // Create a map of player details for easy lookup
      const playerMap = new Map(playerData?.map(p => [p.id, p]))

      // Transform the data into the required format
      const playersWithTeam = teamData.map(reg => {
        let status = reg.status || 'registered'
        
        // Handle reserve status - default to 'reserve_no_offer' for reserve players
        if (status === 'reserve') {
          status = 'reserve_no_offer'
        }

        const playerDetails = playerMap.get(reg.player_id)

        return {
          id: reg.player_id,
          friendly_name: playerDetails?.friendly_name || 'Unknown Player',
          team: reg.team as 'blue' | 'orange' | null,
          status,
          payment_status: reg.payment_status || 'unpaid'
        }
      })

      console.log('Fetched players:', playersWithTeam)
      setPlayers(playersWithTeam)
    } catch (error) {
      console.error('Error fetching game players:', error)
      toast.error('Failed to fetch game players')
    } finally {
      setLoading(false)
    }
  }

  const handleTeamChange = (playerId: string, team: 'blue' | 'orange' | null) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { 
        ...p, 
        team,
        // Update status based on team assignment
        status: team ? 'selected' : p.status === 'selected' ? 'registered' : p.status
      } : p
    ))
  }

  const handleStatusChange = (playerId: string, status: PlayerWithTeam['status']) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { 
        ...p, 
        status,
        // Clear team if player is set to reserve
        team: status === 'reserve_no_offer' || status === 'reserve_declined' ? null : p.team
      } : p
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

  const handleAddPlayer = async (player: { id: string, friendly_name: string }, team: 'blue' | 'orange' | null, status: string) => {
    try {
      // Add player to game_registrations
      const { error } = await supabaseAdmin
        .from('game_registrations')
        .insert({
          game_id: game.id,
          player_id: player.id,
          team: team,
          status: status === 'reserve_no_offer' || status === 'reserve_declined' ? 'reserve' : status,
        })

      if (error) throw error

      // Add player to local state
      setPlayers(prev => [...prev, {
        id: player.id,
        friendly_name: player.friendly_name,
        team,
        status,
        payment_status: 'unpaid'
      }])

      toast.success(`Added ${player.friendly_name} to the game`)
    } catch (error) {
      console.error('Error adding player:', error)
      toast.error('Failed to add player')
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
          completed: true,
          is_historical: true
        })
        .eq('id', game.id)

      if (gameError) throw gameError

      // Update each player with their final status
      for (const player of players) {
        const { error: updateError } = await supabaseAdmin
          .from('game_registrations')
          .update({
            status: ['reserve_no_offer', 'reserve_declined'].includes(player.status || '') ? 'reserve' : player.status,
            team: player.team,
            payment_status: player.payment_status
          })
          .eq('game_id', game.id)
          .eq('player_id', player.id)

        if (updateError) throw updateError
      }

      // Send payment notifications to selected players
      const selectedPlayers = players.filter(p => p.status === 'selected')
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
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow p-6 mb-6"
    >
      <h2 className="text-xl font-semibold mb-4">
        Complete Game #{game.sequence_number} - {format(new Date(game.date), 'dd/MM/yyyy HH:mm')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <ScoreInput
              label="Blue Team Score"
              value={scoreBlue}
              onChange={setScoreBlue}
            />
            <ScoreInput
              label="Orange Team Score"
              value={scoreOrange}
              onChange={setScoreOrange}
            />
            <GameOutcome
              outcome={outcome}
              scoreBlue={scoreBlue}
              scoreOrange={scoreOrange}
              onChange={setOutcome}
              isValid={isOutcomeValid()}
            />
            <div className="form-control">
              <label className="label">
                <span className="label-text">Payment Link</span>
              </label>
              <input
                type="url"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                className="input input-bordered w-full"
                placeholder="https://monzo.me/..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <TeamSection
              players={players}
              teamColor="blue"
              onTeamChange={handleTeamChange}
              onStatusChange={handleStatusChange}
              onPaymentStatusChange={handlePaymentStatusChange}
              showUnassigned={false}
            />
            <TeamSection
              players={players}
              teamColor="orange"
              onTeamChange={handleTeamChange}
              onStatusChange={handleStatusChange}
              onPaymentStatusChange={handlePaymentStatusChange}
              showUnassigned={false}
            />
          </div>

          {/* Unassigned Players Section */}
          <div className="mb-8">
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Unassigned Players
              </h3>
              <TeamSection
                players={players}
                teamColor={null}
                onTeamChange={handleTeamChange}
                onStatusChange={handleStatusChange}
                onPaymentStatusChange={handlePaymentStatusChange}
                showUnassigned={true}
              />
            </div>
          </div>

          {/* Player Search Section */}
          <div className="mb-8">
            <PlayerSearch 
              onPlayerAdd={handleAddPlayer}
              existingPlayerIds={players.map(p => p.id)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            Complete Game
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default GameCompletionForm
