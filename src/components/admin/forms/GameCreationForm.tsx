import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../utils/supabase'
import { toast } from 'react-toastify'
import { GAME_STATUSES } from '../../../types/game'

const GameCreationForm: React.FC = () => {
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [registrationStart, setRegistrationStart] = useState('')
  const [registrationEnd, setRegistrationEnd] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const gameDate = new Date(`${date}T${time}`)
      const regStart = new Date(registrationStart)
      const regEnd = new Date(registrationEnd)

      if (regStart >= regEnd) {
        toast.error('Registration start must be before registration end')
        return
      }

      if (regEnd >= gameDate) {
        toast.error('Registration must end before game starts')
        return
      }

      const gameData = {
        date: gameDate.toISOString(),
        registration_window_start: regStart.toISOString(),
        registration_window_end: regEnd.toISOString(),
        status: GAME_STATUSES.OPEN,
        needs_completion: true,
        is_historical: false,
        teams_announced: false,
        completed: false,
        random_slots: 2,
        max_players: 18,
        score_blue: null,
        score_orange: null,
        outcome: null
      }

      console.log('Attempting to create game with data:', gameData)

      const { error } = await supabase
        .from('games')
        .insert(gameData)

      if (error) {
        console.error('Error creating game:', error)
        if (error.details) console.error('Error details:', error.details)
        if (error.hint) console.error('Error hint:', error.hint)
        toast.error(`Failed to create game: ${error.message || 'Unknown error'}`)
        return
      }

      toast.success('Game created successfully!')
      navigate('/game')
    } catch (error: any) {
      console.error('Error creating game:', error)
      toast.error(`Failed to create game: ${error.message || 'Unknown error'}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Game Date</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Game Time</span>
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Registration Start</span>
        </label>
        <input
          type="datetime-local"
          value={registrationStart}
          onChange={(e) => setRegistrationStart(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Registration End</span>
        </label>
        <input
          type="datetime-local"
          value={registrationEnd}
          onChange={(e) => setRegistrationEnd(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div className="mt-6">
        <button type="submit" className="btn btn-primary w-full">
          Create Game
        </button>
      </div>
    </form>
  )
}

export default GameCreationForm
