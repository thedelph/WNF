import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { supabaseAdmin } from '../../../utils/supabase'
import { Notification } from '../../../types/game'
import { GameCompletionFormProps, PlayerWithTeam, StatusChange } from './types'
import { ScoreInput } from './ScoreInput'
import { GameOutcome } from './GameOutcome'
import { TeamSection } from './TeamSection'
import { PlayerSearch } from './PlayerSearch'
import { Tooltip } from '../../../components/ui/Tooltip'

const GameCompletionForm: React.FC<GameCompletionFormProps> = ({ game, onComplete }) => {
  const [scoreBlue, setScoreBlue] = useState<number | undefined>(game.score_blue)
  const [scoreOrange, setScoreOrange] = useState<number | undefined>(game.score_orange)
  const [outcome, setOutcome] = useState<string | undefined>(game.outcome)
  const [paymentLink, setPaymentLink] = useState<string>(game.payment_link || '')
  const [players, setPlayers] = useState<PlayerWithTeam[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchGamePlayers()
  }, [game.id])

  const fetchGamePlayers = async () => {
    setLoading(true)
    try {
      // First get the game registrations and status changes
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

      // Get status changes for this game
      const { data: statusChanges, error: statusError } = await supabaseAdmin
        .from('player_status_changes')
        .select('*')
        .eq('game_id', game.id)

      if (statusError) throw statusError

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

      // Create a map of status changes by player
      const statusChangeMap = new Map()
      statusChanges?.forEach(change => {
        const changes = statusChangeMap.get(change.player_id) || []
        changes.push({
          fromStatus: change.from_status,
          toStatus: change.to_status,
          changeType: change.change_type,
          timestamp: change.created_at,
          isGameDay: change.is_game_day
        })
        statusChangeMap.set(change.player_id, changes)
      })

      // Transform the data into the required format
      const playersWithTeam = teamData.map(reg => {
        let status = reg.status || 'registered'
        
        // Handle reserve status - default to 'reserve_no_offer' for reserve players
        if (status === 'reserve') {
          status = 'reserve_no_offer'
        }

        const playerDetails = playerMap.get(reg.player_id)
        const playerStatusChanges = statusChangeMap.get(reg.player_id) || []

        return {
          id: reg.player_id,
          friendly_name: playerDetails?.friendly_name || 'Unknown Player',
          team: reg.team as 'blue' | 'orange' | null,
          status,
          payment_status: reg.payment_status || 'unpaid',
          statusChanges: playerStatusChanges
        }
      })

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
        status: team ? 'selected' : p.status === 'selected' ? 'registered' : p.status
      } : p
    ))
  }

  const handleStatusChange = async (playerId: string, status: PlayerWithTeam['status'], statusChange?: StatusChange) => {
    try {
      // If this is a status change that needs to be tracked
      if (statusChange) {
        const { error: changeError } = await supabaseAdmin
          .from('player_status_changes')
          .insert({
            game_id: game.id,
            player_id: playerId,
            from_status: statusChange.fromStatus,
            to_status: statusChange.toStatus,
            change_type: statusChange.changeType,
            created_at: statusChange.timestamp,
            is_game_day: statusChange.isGameDay
          })

        if (changeError) throw changeError
      }

      setPlayers(prev => prev.map(p => 
        p.id === playerId ? { 
          ...p, 
          status,
          team: status === 'reserve_no_offer' || status === 'reserve_declined' ? null : p.team,
          statusChanges: statusChange ? 
            [...(p.statusChanges || []), statusChange] : 
            p.statusChanges
        } : p
      ))
    } catch (error) {
      console.error('Error updating player status:', error)
      toast.error('Failed to update player status')
    }
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
      toast.error('Game outcome does not match the scores')
      return
    }

    setLoading(true)
    try {
      // Update game details
      const { error: gameError } = await supabaseAdmin
        .from('games')
        .update({
          score_blue: scoreBlue,
          score_orange: scoreOrange,
          outcome,
          payment_link: paymentLink,
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', game.id)

      if (gameError) throw gameError

      // Update player registrations and status changes
      const updates = players.map(player => {
        const registration = {
          team: player.team,
          status: player.status === 'reserve_no_offer' || player.status === 'reserve_declined' ? 'reserve' : player.status,
          payment_status: player.payment_status
        }

        return supabaseAdmin
          .from('game_registrations')
          .update(registration)
          .eq('game_id', game.id)
          .eq('player_id', player.id)
      })

      await Promise.all(updates)

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
