'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabaseAdmin } from '../../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Game } from '../../../../types/game'
import { Player } from '../../../../types/player'

interface Props {
  game: Game
  onClose: () => void
  onSaved: () => void
}

type GameOutcome = 'blue_win' | 'orange_win' | 'draw' | null;

const EditGameModal: React.FC<Props> = ({ game, onClose, onSaved }) => {
  const [date, setDate] = useState(game.date.split('T')[0])
  const [blueScore, setBlueScore] = useState(game.score_blue?.toString() || '')
  const [orangeScore, setOrangeScore] = useState(game.score_orange?.toString() || '')
  const [bluePlayers, setBluePlayers] = useState<Player[]>([])
  const [orangePlayers, setOrangePlayers] = useState<Player[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [outcome, setOutcome] = useState<GameOutcome>(game.outcome as GameOutcome || null)

  // Fetch all players and set initial team assignments
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all players
        const { data: players, error: playersError } = await supabaseAdmin
          .from('players')
          .select('*')
          .order('friendly_name')

        if (playersError) throw playersError

        setAvailablePlayers(players)

        // Set initial team assignments from game registrations
        const blueTeam = game.game_registrations
          ?.filter(reg => reg.team === 'blue')
          .map(reg => players.find(p => p.id === reg.player_id))
          .filter((p): p is Player => p !== undefined) || []

        const orangeTeam = game.game_registrations
          ?.filter(reg => reg.team === 'orange')
          .map(reg => players.find(p => p.id === reg.player_id))
          .filter((p): p is Player => p !== undefined) || []

        setBluePlayers(blueTeam)
        setOrangePlayers(orangeTeam)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load players')
      }
    }

    fetchData()
  }, [game])

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

      // Update game details
      const { error: gameError } = await supabaseAdmin
        .from('games')
        .update({
          date: gameDate.toISOString(),
          score_blue: blueScore === '' ? null : parseInt(blueScore),
          score_orange: orangeScore === '' ? null : parseInt(orangeScore),
          outcome: determineOutcome(blueScore, orangeScore, outcome),
          registration_window_start: regStart.toISOString(),
          registration_window_end: regEnd.toISOString(),
          max_players: Math.max(bluePlayers.length + orangePlayers.length, 10)
        })
        .eq('id', game.id)

      if (gameError) throw gameError

      // Delete existing registrations
      const { error: deleteError } = await supabaseAdmin
        .from('game_registrations')
        .delete()
        .eq('game_id', game.id)

      if (deleteError) throw deleteError

      // Create new registrations for blue team
      if (bluePlayers.length > 0) {
        const { error: blueError } = await supabaseAdmin
          .from('game_registrations')
          .insert(
            bluePlayers.map(player => ({
              game_id: game.id,
              player_id: player.id,
              team: 'blue',
              status: 'selected'
            }))
          )
        if (blueError) throw blueError
      }

      // Create new registrations for orange team
      if (orangePlayers.length > 0) {
        const { error: orangeError } = await supabaseAdmin
          .from('game_registrations')
          .insert(
            orangePlayers.map(player => ({
              game_id: game.id,
              player_id: player.id,
              team: 'orange',
              status: 'selected'
            }))
          )
        if (orangeError) throw orangeError
      }

      toast.success('Game updated successfully')
      onSaved()
    } catch (error) {
      console.error('Error updating game:', error)
      toast.error('Failed to update game')
    } finally {
      setIsSaving(false)
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

  return (
    <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Edit Historical Game</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Date</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input input-bordered"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Blue Team</h3>
              <select
                className="select select-bordered w-full mb-2"
                onChange={(e) => {
                  const player = availablePlayers.find(p => p.id === e.target.value)
                  if (player) setBluePlayers([...bluePlayers, player])
                }}
                value=""
              >
                <option value="">Add player...</option>
                {availablePlayers
                  .filter(p => 
                    !bluePlayers.some(bp => bp.id === p.id) && 
                    !orangePlayers.some(op => op.id === p.id)
                  )
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      {player.friendly_name}
                    </option>
                  ))}
              </select>
              <ul className="space-y-2">
                {bluePlayers.map(player => (
                  <li key={player.id} className="flex justify-between items-center bg-base-200 p-2 rounded">
                    <span>{player.friendly_name}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setBluePlayers(bluePlayers.filter(p => p.id !== player.id))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Orange Team</h3>
              <select
                className="select select-bordered w-full mb-2"
                onChange={(e) => {
                  const player = availablePlayers.find(p => p.id === e.target.value)
                  if (player) setOrangePlayers([...orangePlayers, player])
                }}
                value=""
              >
                <option value="">Add player...</option>
                {availablePlayers
                  .filter(p => 
                    !bluePlayers.some(bp => bp.id === p.id) && 
                    !orangePlayers.some(op => op.id === p.id)
                  )
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      {player.friendly_name}
                    </option>
                  ))}
              </select>
              <ul className="space-y-2">
                {orangePlayers.map(player => (
                  <li key={player.id} className="flex justify-between items-center bg-base-200 p-2 rounded">
                    <span>{player.friendly_name}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setOrangePlayers(orangePlayers.filter(p => p.id !== player.id))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Blue Score</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={blueScore}
                  onChange={(e) => setBlueScore(e.target.value)}
                  className="input input-bordered flex-1"
                  min="0"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Orange Score</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={orangeScore}
                  onChange={(e) => setOrangeScore(e.target.value)}
                  className="input input-bordered flex-1"
                  min="0"
                />
              </div>
            </div>
          </div>
          {(blueScore !== '' || orangeScore !== '') && (
            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setBlueScore('')
                  setOrangeScore('')
                }}
              >
                Clear Scores
              </button>
            </div>
          )}

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

          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              className="btn" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving || 
                !date || 
                (bluePlayers.length === 0 && orangePlayers.length === 0)}
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