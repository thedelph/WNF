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
import { StatusChangeHistory } from './StatusChangeHistory'
import { useNavigate } from 'react-router-dom'

const GameCompletionForm: React.FC<GameCompletionFormProps> = ({ game, onComplete }) => {
  const [scoreBlue, setScoreBlue] = useState<number | undefined>(game.score_blue)
  const [scoreOrange, setScoreOrange] = useState<number | undefined>(game.score_orange)
  const [outcome, setOutcome] = useState<string | undefined>(game.outcome)
  const [paymentLink, setPaymentLink] = useState<string>(game.payment_link || '')
  const [players, setPlayers] = useState<PlayerWithTeam[]>([])
  const [loading, setLoading] = useState(false)
  const [gameDate] = useState<Date>(new Date(game.date))
  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([])
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({})
  const navigate = useNavigate()

  useEffect(() => {
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
            payment_status,
            player:player_id (
              id,
              friendly_name
            )
          `)
          .eq('game_id', game.id)

        if (teamError) throw teamError

        // Get status changes for this game
        const { data: changes, error } = await supabaseAdmin
          .from('player_status_changes')
          .select(`
            *,
            player:player_id (
              id,
              friendly_name
            )
          `)
          .eq('game_id', game.id)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching status changes:', error)
          return
        }

        if (!teamData?.length) {
          setPlayers([])
          return
        }

        // Build player names map
        const namesMap: Record<string, string> = {}
        teamData.forEach((reg) => {
          if (reg.player) {
            namesMap[reg.player_id] = reg.player.friendly_name
          }
        })
        setPlayerNames(namesMap)

        // Transform the data
        const transformedPlayers = teamData.map((reg) => ({
          id: reg.player_id,
          team: reg.team,
          status: reg.status,
          payment_status: reg.payment_status,
          friendly_name: reg.player?.friendly_name || 'Unknown Player'
        }))

        setPlayers(transformedPlayers)
        setStatusChanges(changes || [])
      } catch (error) {
        console.error('Error fetching game players:', error)
        toast.error('Failed to fetch game players')
      } finally {
        setLoading(false)
      }
    }

    fetchGamePlayers()
  }, [game.id])

  const handleTeamChange = (playerId: string, team: 'blue' | 'orange' | null) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { 
        ...p, 
        team,
        status: team ? 'selected' : p.status === 'selected' ? 'registered' : p.status
      } : p
    ))
  }

  const handleStatusChange = async (
    playerId: string,
    newStatus: PlayerWithTeam['status'],
    changeDate: Date,
    isGameDay: boolean,
    wasReserve?: boolean
  ) => {
    console.log('Handling status change:')
    console.log('Player ID:', playerId)
    console.log('New status:', newStatus)
    console.log('Change date:', changeDate)
    console.log('Is game day:', isGameDay)
    console.log('Was reserve:', wasReserve)
    
    try {
      const player = players.find(p => p.id === playerId)
      if (!player) {
        console.error('Player not found:', playerId)
        return
      }

      // If this is a selected player being marked as accepting a dropout slot
      if (wasReserve && newStatus === 'selected') {
        console.log('Recording reserve acceptance')
        // Record that they were a reserve who accepted a slot
        const { error: statusError } = await supabaseAdmin
          .from('player_status_changes')
          .insert({
            player_id: playerId,
            game_id: game.id,
            from_status: 'reserve_no_offer',
            to_status: 'selected',
            change_type: 'slot_response',
            is_game_day: isGameDay,
            created_at: changeDate.toISOString()
          })

        if (statusError) {
          console.error('Error recording status change:', statusError)
          throw statusError
        }
        
        console.log('Successfully recorded reserve acceptance')
        toast.success(`Recorded that ${player.friendly_name} accepted a dropout slot`)
      }
      // If this is a reserve declining a slot
      else if (newStatus === 'reserve_declined') {
        console.log('Recording reserve decline')
        // Record that they declined a slot
        const { error: statusError } = await supabaseAdmin
          .from('player_status_changes')
          .insert({
            player_id: playerId,
            game_id: game.id,
            from_status: 'reserve_no_offer',
            to_status: 'reserve_declined',
            change_type: 'slot_response',
            is_game_day: isGameDay,
            created_at: changeDate.toISOString()
          })

        if (statusError) {
          console.error('Error recording status change:', statusError)
          throw statusError
        }

        // Update the player's status in game_registrations
        const { error: registrationError } = await supabaseAdmin
          .from('game_registrations')
          .update({ status: 'reserve_declined' })
          .eq('game_id', game.id)
          .eq('player_id', playerId)

        if (registrationError) {
          console.error('Error updating player registration:', registrationError)
          throw registrationError
        }
        
        console.log('Successfully recorded reserve decline')
        toast.success(`Recorded that ${player.friendly_name} declined a slot`)
      }
      // If this is a player dropping out
      else if (newStatus === 'dropped_out') {
        console.log('Recording dropout')
        const { error: statusError } = await supabaseAdmin
          .from('player_status_changes')
          .insert({
            player_id: playerId,
            game_id: game.id,
            from_status: player.status || 'registered',
            to_status: 'dropped_out',
            change_type: 'dropout',
            is_game_day: isGameDay,
            created_at: changeDate.toISOString()
          })

        if (statusError) {
          console.error('Error recording status change:', statusError)
          throw statusError
        }

        // Update the player's status in game_registrations
        const { error: registrationError } = await supabaseAdmin
          .from('game_registrations')
          .update({ status: 'dropped_out' })
          .eq('game_id', game.id)
          .eq('player_id', playerId)

        if (registrationError) {
          console.error('Error updating player registration:', registrationError)
          throw registrationError
        }

        console.log('Successfully recorded dropout')
        toast.success(`Recorded that ${player.friendly_name} dropped out`)
      }

      // Update local state
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.id === playerId 
            ? { ...p, status: newStatus }
            : p
        )
      )

      // Refresh the status changes
      const { data: newChanges, error: fetchError } = await supabaseAdmin
        .from('player_status_changes')
        .select(`
          *,
          player:player_id (
            id,
            friendly_name
          )
        `)
        .eq('game_id', game.id)
        .order('created_at', { ascending: true })

      if (fetchError) {
        console.error('Error fetching updated changes:', fetchError)
        throw fetchError
      }
      console.log('Updated status changes:', newChanges)
      setStatusChanges(newChanges || [])
    } catch (error) {
      console.error('Error updating player status:', error)
      toast.error('Failed to update player status')
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    try {
      const player = players.find(p => p.id === playerId)
      if (!player) {
        console.error('Player not found:', playerId)
        return
      }

      // Delete the player's registration
      const { error: deleteError } = await supabaseAdmin
        .from('game_registrations')
        .delete()
        .eq('game_id', game.id)
        .eq('player_id', playerId)

      if (deleteError) {
        console.error('Error removing player:', deleteError)
        throw deleteError
      }

      // Also delete any status changes for this player in this game
      const { error: statusError } = await supabaseAdmin
        .from('player_status_changes')
        .delete()
        .eq('game_id', game.id)
        .eq('player_id', playerId)

      if (statusError) {
        console.error('Error removing status changes:', statusError)
        throw statusError
      }

      // Update local state
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId))
      setStatusChanges(prevChanges => prevChanges.filter(c => c.player_id !== playerId))

      toast.success(`Removed ${player.friendly_name} from the game`)
    } catch (error) {
      console.error('Error removing player:', error)
      toast.error('Failed to remove player')
    }
  }

  const isGameDay = () => {
    const gameDate = new Date(game.date)
    const today = new Date()
    return (
      gameDate.getFullYear() === today.getFullYear() &&
      gameDate.getMonth() === today.getMonth() &&
      gameDate.getDate() === today.getDate()
    )
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
      // Map reserve_declined to reserve for game_registrations
      const registrationStatus = status === 'reserve_declined' ? 'reserve' : status

      // Add player to game
      const { error: registrationError } = await supabaseAdmin
        .from('game_registrations')
        .insert({
          player_id: player.id,
          game_id: game.id,
          status: registrationStatus,
          team: team
        })

      if (registrationError) throw registrationError

      // Refresh players list using player_id as the foreign key reference
      const { data: updatedPlayers, error: playersError } = await supabaseAdmin
        .from('game_registrations')
        .select(`
          *,
          player:player_id (
            id,
            friendly_name
          )
        `)
        .eq('game_id', game.id)
        .order('created_at', { ascending: true })

      if (playersError) throw playersError

      // Refresh status changes with player details
      const { data: newChanges, error: changesError } = await supabaseAdmin
        .from('player_status_changes')
        .select(`
          *,
          player:player_id (
            id,
            friendly_name
          )
        `)
        .eq('game_id', game.id)
        .order('created_at', { ascending: true })

      if (changesError) throw changesError

      setPlayers(updatedPlayers.map(reg => ({
        ...reg.player,
        team: reg.team,
        status: reg.status,
        payment_status: reg.payment_status
      })))
      setStatusChanges(newChanges || [])

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
          status: 'completed',
          completed: true
        })
        .eq('id', game.id)

      if (gameError) throw gameError

      // Update player registrations one at a time
      for (const player of players) {
        const registration = {
          team: player.team,
          status: player.status === 'reserve_no_offer' || player.status === 'reserve_declined' ? 'reserve' : player.status,
          payment_status: player.payment_status
        }

        const { error: registrationError } = await supabaseAdmin
          .from('game_registrations')
          .update(registration)
          .eq('game_id', game.id)
          .eq('player_id', player.id)

        if (registrationError) {
          console.error('Error updating registration for player:', player.id, registrationError)
          throw registrationError
        }
      }

      toast.success('Game completed successfully')
      navigate('/admin/games')
    } catch (error) {
      console.error('Error completing game:', error)
      toast.error('Failed to complete game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Blue Team */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-blue-600">Blue Team</h3>
              <TeamSection
                players={players}
                teamColor="blue"
                onTeamChange={handleTeamChange}
                onStatusChange={handleStatusChange}
                onPaymentStatusChange={handlePaymentStatusChange}
                onRemovePlayer={handleRemovePlayer}
                showUnassigned={false}
                gameDate={gameDate}
              />
            </div>

            {/* Orange Team */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-orange-600">Orange Team</h3>
              <TeamSection
                players={players}
                teamColor="orange"
                onTeamChange={handleTeamChange}
                onStatusChange={handleStatusChange}
                onPaymentStatusChange={handlePaymentStatusChange}
                onRemovePlayer={handleRemovePlayer}
                showUnassigned={false}
                gameDate={gameDate}
              />
            </div>
          </div>

          {/* Unassigned Players */}
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">Unassigned Players</h3>
            <TeamSection
              players={players}
              onTeamChange={handleTeamChange}
              onStatusChange={handleStatusChange}
              onPaymentStatusChange={handlePaymentStatusChange}
              onRemovePlayer={handleRemovePlayer}
              showUnassigned={true}
              gameDate={gameDate}
            />
          </div>

          {/* Player Search Section */}
          <div className="mb-8">
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body">
                <h2 className="card-title">Add Player</h2>
                <PlayerSearch 
                  onPlayerAdd={handleAddPlayer}
                  existingPlayerIds={players.map(p => p.id)}
                  gameDate={new Date(game.date)}
                  gameId={game.id}
                />
              </div>
            </div>
          </div>

          {/* Status Change History */}
          <div className="mb-8">
            <StatusChangeHistory 
              changes={statusChanges || []}
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
    </div>
  )
}

export default GameCompletionForm
