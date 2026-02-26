'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { supabaseAdmin } from '../../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Game } from '../../../../types/game'
import { Player } from '../../../../types/player'
import { PlayerWithTeam, StatusChange, PlayerStatus } from '../types'
import { TeamSection } from '../TeamSection'
import { PlayerSearch } from '../PlayerSearch'
import { StatusChangeHistory } from '../StatusChangeHistory'

interface Props {
  game: Game
  onClose: () => void
  onGameUpdated: () => void
}

type GameOutcome = 'blue_win' | 'orange_win' | 'draw' | null;

const EditGameModal: React.FC<Props> = ({ game, onClose, onGameUpdated }) => {
  const [date, setDate] = useState(game.date.split('T')[0])
  const [blueScore, setBlueScore] = useState(game.score_blue?.toString() || '')
  const [orangeScore, setOrangeScore] = useState(game.score_orange?.toString() || '')
  const [outcome, setOutcome] = useState<GameOutcome>(game.outcome || null)
  const [pitchCost, setPitchCost] = useState<string>(game.pitch_cost?.toString() || '')
  const [paymentLink, setPaymentLink] = useState<string>(game.payment_link || '')
  const [youtubeUrl, setYoutubeUrl] = useState<string>(game.youtube_url || '')
  const [teamLeft, setTeamLeft] = useState<'blue' | 'orange'>(game.team_left ?? 'blue')
  const [players, setPlayers] = useState<PlayerWithTeam[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([])
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'teams' | 'status' | 'payment'>('teams')

  // Fetch all game data including registrations and status changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch all players for the dropdown
        const { data: allPlayers, error: playersError } = await supabaseAdmin
          .from('players')
          .select('*')
          .order('friendly_name')

        if (playersError) throw playersError
        setAvailablePlayers(allPlayers)

        // Fetch game registrations with full details
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

        // Fetch status changes for this game
        const { data: changes, error: changesError } = await supabaseAdmin
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

        if (changesError) {
          console.error('Error fetching status changes:', changesError)
        }

        // Build player names map
        const namesMap: Record<string, string> = {}
        teamData?.forEach((reg) => {
          if (reg.player) {
            namesMap[reg.player_id] = reg.player.friendly_name
          }
        })
        setPlayerNames(namesMap)

        // Transform the registration data
        const transformedPlayers = teamData?.map((reg) => ({
          id: reg.player_id,
          team: reg.team,
          status: reg.status as PlayerStatus,
          payment_status: reg.payment_status,
          friendly_name: reg.player?.friendly_name || 'Unknown Player'
        })) || []

        setPlayers(transformedPlayers)
        setStatusChanges(changes || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load game data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [game])

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
    newStatus: PlayerStatus,
    changeDate: Date,
    isGameDay: boolean,
    wasReserve?: boolean
  ) => {
    try {
      const player = players.find(p => p.id === playerId)
      if (!player) {
        console.error('Player not found:', playerId)
        return
      }

      // Record status change if needed
      if (wasReserve && newStatus === 'selected') {
        const { error: statusError } = await supabaseAdmin
          .from('player_status_changes')
          .insert({
            player_id: playerId,
            game_id: game.id,
            from_status: 'reserve',
            to_status: 'selected',
            change_type: 'slot_response',
            is_game_day: isGameDay,
            created_at: changeDate.toISOString()
          })

        if (statusError) {
          console.error('Error recording status change:', statusError)
          throw statusError
        }
        
        toast.success(`Recorded that ${player.friendly_name} accepted a dropout slot`)
      } else if (newStatus === 'reserve_declined') {
        const { error: statusError } = await supabaseAdmin
          .from('player_status_changes')
          .insert({
            player_id: playerId,
            game_id: game.id,
            from_status: 'reserve',
            to_status: 'reserve_declined',
            change_type: 'slot_response',
            is_game_day: isGameDay,
            created_at: changeDate.toISOString()
          })

        if (statusError) {
          console.error('Error recording status change:', statusError)
          throw statusError
        }
        
        toast.success(`Recorded that ${player.friendly_name} declined a slot`)
      } else if (newStatus === 'dropped_out') {
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

      // Refresh status changes
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
      setStatusChanges(newChanges || [])
    } catch (error) {
      console.error('Error updating player status:', error)
      toast.error('Failed to update player status')
    }
  }

  const handlePaymentStatusChange = async (playerId: string, status: 'unpaid' | 'marked_paid' | 'admin_verified') => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, payment_status: status } : p
    ))
    toast.success('Payment status updated')
  }

  const handleRemovePlayer = async (playerId: string) => {
    try {
      const player = players.find(p => p.id === playerId)
      if (!player) {
        console.error('Player not found:', playerId)
        return
      }

      // Remove from local state
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId))
      setStatusChanges(prevChanges => prevChanges.filter(c => c.player_id !== playerId))

      toast.success(`Removed ${player.friendly_name} from the game`)
    } catch (error) {
      console.error('Error removing player:', error)
      toast.error('Failed to remove player')
    }
  }

  const handleAddPlayer = async (player: { id: string, friendly_name: string }, team: 'blue' | 'orange' | null, status: string) => {
    try {
      // Add to local state
      const newPlayer: PlayerWithTeam = {
        id: player.id,
        friendly_name: player.friendly_name,
        team: team,
        status: status as PlayerStatus,
        payment_status: 'unpaid',
        caps: 0,
        active_bonuses: 0,
        active_penalties: 0,
        current_streak: 0
      }

      setPlayers(prev => [...prev, newPlayer])
      toast.success(`Added ${player.friendly_name} to the game`)
    } catch (error) {
      console.error('Error adding player:', error)
      toast.error('Failed to add player')
    }
  }

  const determineOutcome = (blue: string, orange: string, manualOutcome: GameOutcome): GameOutcome => {
    if (manualOutcome && (blue === '' || orange === '')) return manualOutcome
    
    if (blue !== '' && orange !== '') {
      const blueNum = parseInt(blue)
      const orangeNum = parseInt(orange)
      if (blueNum > orangeNum) return 'blue_win'
      if (orangeNum > blueNum) return 'orange_win'
      return 'draw'
    }
    
    return null
  }

  const isOutcomeValid = () => {
    if (blueScore === '' || orangeScore === '') return true
    
    const calculatedOutcome = determineOutcome(blueScore, orangeScore, outcome)
    return calculatedOutcome === outcome
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const gameDate = new Date(date)
      gameDate.setUTCHours(23, 59, 59, 999)

      const regStart = new Date(date)
      regStart.setUTCHours(0, 0, 0, 0)
      
      const regEnd = new Date(date)
      regEnd.setUTCHours(23, 59, 58, 999)

      // Prepare the update object
      const updateData = {
        date: gameDate.toISOString(),
        registration_window_start: regStart.toISOString(),
        registration_window_end: regEnd.toISOString(),
        max_players: Math.max(players.filter(p => p.team).length, 10),
        pitch_cost: pitchCost !== '' ? parseFloat(pitchCost) : null,
        payment_link: paymentLink || null,
        youtube_url: youtubeUrl || null,
        team_left: teamLeft,
      } as any

      // Only add scores and outcome if they are valid
      if (blueScore !== '') {
        updateData.score_blue = parseInt(blueScore)
      }
      if (orangeScore !== '') {
        updateData.score_orange = parseInt(orangeScore)
      }

      const calculatedOutcome = determineOutcome(blueScore, orangeScore, outcome)
      if (calculatedOutcome) {
        updateData.outcome = calculatedOutcome
      }

      // Update game details
      const { error: gameError } = await supabaseAdmin
        .from('games')
        .update(updateData)
        .eq('id', game.id)

      if (gameError) throw gameError

      // Delete existing registrations
      const { error: deleteError } = await supabaseAdmin
        .from('game_registrations')
        .delete()
        .eq('game_id', game.id)

      if (deleteError) throw deleteError

      // Create new registrations with all details
      const registrations = players.map(player => ({
        game_id: game.id,
        player_id: player.id,
        team: player.team,
        status: player.status === 'reserve_declined' ? 'reserve' : player.status,
        payment_status: player.payment_status,
        selection_method: player.status === 'selected' ? 'merit' : 'none'
      }))

      if (registrations.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('game_registrations')
          .insert(registrations)

        if (insertError) throw insertError
      }

      toast.success('Game updated successfully')
      onGameUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating game:', error)
      toast.error('Failed to update game')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="loading loading-spinner loading-lg"></div>
      </motion.div>
    )
  }

  return (
    <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-base-300">
          <h2 className="text-2xl font-bold">
            Edit Game #{game.sequence_number} - {format(new Date(game.date), 'dd/MM/yyyy HH:mm')}
          </h2>
          
          {/* Tab Navigation */}
          <div className="tabs tabs-box mt-4">
            <button 
              className={`tab ${activeTab === 'teams' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('teams')}
            >
              Teams & Players
            </button>
            <button 
              className={`tab ${activeTab === 'status' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('status')}
            >
              Status Changes
            </button>
            <button 
              className={`tab ${activeTab === 'payment' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('payment')}
            >
              Payment & Scores
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div className="space-y-6">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Game Date</legend>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                  required
                />
              </fieldset>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Blue Team */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">Blue Team</h3>
                  <TeamSection
                    players={players}
                    teamColor="blue"
                    onTeamChange={handleTeamChange}
                    onStatusChange={handleStatusChange}
                    onPaymentStatusChange={handlePaymentStatusChange}
                    onRemovePlayer={handleRemovePlayer}
                    showUnassigned={false}
                    gameDate={new Date(date)}
                  />
                </div>

                {/* Orange Team */}
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <h3 className="text-xl font-bold mb-4 text-orange-600 dark:text-orange-400">Orange Team</h3>
                  <TeamSection
                    players={players}
                    teamColor="orange"
                    onTeamChange={handleTeamChange}
                    onStatusChange={handleStatusChange}
                    onPaymentStatusChange={handlePaymentStatusChange}
                    onRemovePlayer={handleRemovePlayer}
                    showUnassigned={false}
                    gameDate={new Date(date)}
                  />
                </div>
              </div>

              {/* Unassigned Players */}
              <div className="bg-base-200 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Unassigned Players</h3>
                <TeamSection
                  players={players}
                  onTeamChange={handleTeamChange}
                  onStatusChange={handleStatusChange}
                  onPaymentStatusChange={handlePaymentStatusChange}
                  onRemovePlayer={handleRemovePlayer}
                  showUnassigned={true}
                  gameDate={new Date(date)}
                />
              </div>

              {/* Add Player Section */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title">Add Player</h3>
                  <PlayerSearch 
                    onPlayerAdd={handleAddPlayer}
                    existingPlayerIds={players.map(p => p.id)}
                    gameDate={new Date(date)}
                    gameId={game.id}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status Changes Tab */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <StatusChangeHistory 
                changes={statusChanges || []}
              />
              
              {statusChanges.length === 0 && (
                <div className="text-center py-8 text-base-content/60">
                  No status changes recorded for this game
                </div>
              )}
            </div>
          )}

          {/* Payment & Scores Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Pitch Cost (£)</legend>
                <input
                  type="number"
                  value={pitchCost}
                  onChange={(e) => setPitchCost(e.target.value)}
                  className="input w-full"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Payment Link (Monzo)</legend>
                <input
                  type="url"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  className="input w-full"
                  placeholder="https://monzo.me/..."
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">YouTube Video URL (optional)</legend>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="input w-full"
                  placeholder="https://youtu.be/..."
                />
                <p className="text-xs text-base-content/60 mt-1">Paste YouTube link for the game recording</p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Team on LEFT in video</legend>
                <select
                  className="select w-full"
                  value={teamLeft}
                  onChange={(e) => setTeamLeft(e.target.value as 'blue' | 'orange')}
                >
                  <option value="blue">Blue (default)</option>
                  <option value="orange">Orange</option>
                </select>
                <p className="text-xs text-base-content/60 mt-1">Which team plays on the left side of the pitch in the video?</p>
              </fieldset>

              <div className="grid grid-cols-2 gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Blue Score</legend>
                  <input
                    type="number"
                    value={blueScore}
                    onChange={(e) => setBlueScore(e.target.value)}
                    className="input"
                    min="0"
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Orange Score</legend>
                  <input
                    type="number"
                    value={orangeScore}
                    onChange={(e) => setOrangeScore(e.target.value)}
                    className="input"
                    min="0"
                  />
                </fieldset>
              </div>

              {(blueScore !== '' || orangeScore !== '') && !isOutcomeValid() && (
                <div className="alert alert-warning">
                  <span>Game outcome does not match the scores</span>
                </div>
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Game Outcome</legend>
                <select
                  className="select w-full"
                  value={outcome || ''}
                  onChange={(e) => setOutcome(e.target.value as GameOutcome)}
                >
                  <option value="">Unknown/Use Scores</option>
                  <option value="blue_win">Blue Team Won</option>
                  <option value="orange_win">Orange Team Won</option>
                  <option value="draw">Draw</option>
                </select>
              </fieldset>

              {/* Player Payment Status Summary */}
              <div className="bg-base-200 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Payment Status Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-error">
                      {players.filter(p => !p.payment_status || p.payment_status === 'unpaid').length}
                    </div>
                    <div className="text-sm opacity-70">Unpaid</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-warning">
                      {players.filter(p => p.payment_status === 'marked_paid').length}
                    </div>
                    <div className="text-sm opacity-70">Marked Paid</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-success">
                      {players.filter(p => p.payment_status === 'admin_verified').length}
                    </div>
                    <div className="text-sm opacity-70">Verified</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-6 border-t border-base-300 mt-6">
            <button 
              type="button" 
              className="btn" 
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving || !date}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

export default EditGameModal