'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Player } from '../../../types/player'

interface Props {
  onGameAdded: () => void
}

interface TeamPlayer {
  id: string
  name: string
}

type GameOutcome = 'blue_win' | 'orange_win' | 'draw' | null;

const HistoricalGameForm: React.FC<Props> = ({ onGameAdded }) => {
  const [date, setDate] = useState('')
  const [blueScore, setBlueScore] = useState('')
  const [orangeScore, setOrangeScore] = useState('')
  const [bluePlayers, setBluePlayers] = useState<TeamPlayer[]>([])
  const [orangePlayers, setOrangePlayers] = useState<TeamPlayer[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [outcome, setOutcome] = useState<GameOutcome>(null)

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name')
        .order('friendly_name')

      if (error) throw error
      setAvailablePlayers(data)
    } catch (error) {
      toast.error('Failed to fetch players')
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const [year, month, day] = date.split('-').map(num => parseInt(num))
      
      const gameDate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0))
      const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
      const endDate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0))

      const gameData = {
        date: gameDate.toISOString(),
        score_blue: blueScore === '' ? null : parseInt(blueScore),
        score_orange: orangeScore === '' ? null : parseInt(orangeScore),
        status: 'completed',
        is_historical: true,
        registration_window_start: startDate.toISOString(),
        registration_window_end: endDate.toISOString(),
        max_players: Math.max(bluePlayers.length + orangePlayers.length, 10),
        random_slots: 0,
        outcome: determineOutcome(blueScore, orangeScore, outcome)
      }

      const { data: game, error: gameError } = await supabaseAdmin
        .from('games')
        .insert(gameData)
        .select()
        .single()

      if (gameError) throw gameError

      if (bluePlayers.length > 0) {
        const blueRegistrations = bluePlayers.map(player => ({
          game_id: game.id,
          player_id: player.id,
          team: 'blue',
          status: 'selected'
        }))
        
        const { error: blueError } = await supabaseAdmin
          .from('game_registrations')
          .insert(blueRegistrations)

        if (blueError) throw blueError
      }

      if (orangePlayers.length > 0) {
        const orangeRegistrations = orangePlayers.map(player => ({
          game_id: game.id,
          player_id: player.id,
          team: 'orange',
          status: 'selected'
        }))

        const { error: orangeError } = await supabaseAdmin
          .from('game_registrations')
          .insert(orangeRegistrations)

        if (orangeError) throw orangeError
      }

      console.log('Created game with registrations:', {
        game,
        bluePlayers,
        orangePlayers
      })

      toast.success('Historical game added successfully')
      onGameAdded()
      resetForm()
    } catch (error) {
      console.error('Error adding historical game:', error)
      toast.error('Failed to add historical game')
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setDate('')
    setBlueScore('')
    setOrangeScore('')
    setBluePlayers([])
    setOrangePlayers([])
    setOutcome(null)
  }

  const addPlayer = (player: Player, team: 'blue' | 'orange') => {
    const teamPlayer = { id: player.id, name: player.friendly_name }
    if (team === 'blue') {
      setBluePlayers([...bluePlayers, teamPlayer])
    } else {
      setOrangePlayers([...orangePlayers, teamPlayer])
    }
  }

  const removePlayer = (playerId: string, team: 'blue' | 'orange') => {
    if (team === 'blue') {
      setBluePlayers(bluePlayers.filter(p => p.id !== playerId))
    } else {
      setOrangePlayers(orangePlayers.filter(p => p.id !== playerId))
    }
  }

  const determineOutcome = (blue: string, orange: string, manualOutcome: GameOutcome): GameOutcome => {
    if (manualOutcome) return manualOutcome
    if (blue === '' || orange === '') return null
    const blueNum = parseInt(blue)
    const orangeNum = parseInt(orange)
    if (blueNum > orangeNum) return 'blue_win'
    if (orangeNum > blueNum) return 'orange_win'
    return 'draw'
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center h-64"
      >
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <h2 className="card-title text-2xl font-bold mb-6">Add Historical Game</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Date</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TeamSelect
              label="Blue Team"
              players={availablePlayers}
              selectedPlayers={bluePlayers}
              otherTeamPlayers={orangePlayers}
              onAddPlayer={(player) => addPlayer(player, 'blue')}
              onRemovePlayer={(playerId) => removePlayer(playerId, 'blue')}
            />
            <TeamSelect
              label="Orange Team"
              players={availablePlayers}
              selectedPlayers={orangePlayers}
              otherTeamPlayers={bluePlayers}
              onAddPlayer={(player) => addPlayer(player, 'orange')}
              onRemovePlayer={(playerId) => removePlayer(playerId, 'orange')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Blue Score (Optional)</span>
              </label>
              <input
                type="number"
                value={blueScore}
                onChange={(e) => setBlueScore(e.target.value)}
                className="input input-bordered w-full"
                min="0"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Orange Score (Optional)</span>
              </label>
              <input
                type="number"
                value={orangeScore}
                onChange={(e) => setOrangeScore(e.target.value)}
                className="input input-bordered w-full"
                min="0"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Game Outcome (if scores unknown)</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={outcome || ''}
              onChange={(e) => setOutcome(e.target.value as GameOutcome)}
              disabled={blueScore !== '' || orangeScore !== ''}
            >
              <option value="">Unknown/Use Scores</option>
              <option value="blue_win">Blue Team Won</option>
              <option value="orange_win">Orange Team Won</option>
              <option value="draw">Draw</option>
            </select>
          </div>

          <div className="card-actions justify-end">
            <button 
              type="submit" 
              className={`btn btn-primary ${isSaving ? 'loading' : ''}`}
              disabled={isSaving || 
                !date || 
                (bluePlayers.length === 0 && orangePlayers.length === 0)}
            >
              {isSaving ? 'Adding...' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

interface TeamSelectProps {
  label: string
  players: Player[]
  selectedPlayers: TeamPlayer[]
  otherTeamPlayers: TeamPlayer[]
  onAddPlayer: (player: Player) => void
  onRemovePlayer: (playerId: string) => void
}

const TeamSelect: React.FC<TeamSelectProps> = ({
  label,
  players,
  selectedPlayers,
  otherTeamPlayers,
  onAddPlayer,
  onRemovePlayer
}) => {
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      <select
        className="select select-bordered w-full mb-2"
        onChange={(e) => {
          const player = players.find(p => p.id === e.target.value)
          if (player) onAddPlayer(player)
        }}
        value=""
      >
        <option value="">Add player...</option>
        {players
          .filter(p => !selectedPlayers.some(sp => sp.id === p.id) && 
                       !otherTeamPlayers.some(op => op.id === p.id))
          .map(player => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
      </select>
      <ul className="space-y-2">
        {selectedPlayers.map(player => (
          <motion.li
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex justify-between items-center bg-base-200 p-2 rounded-lg"
          >
            <span>{player.name}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => onRemovePlayer(player.id)}
            >
              ×
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

export default HistoricalGameForm