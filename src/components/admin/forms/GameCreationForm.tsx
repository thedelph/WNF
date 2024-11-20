import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../utils/supabase'
import { toast } from 'react-toastify'

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

      const { error } = await supabase
        .from('games')
        .insert({
          date: gameDate.toISOString(),
          registration_window_start: regStart.toISOString(),
          registration_window_end: regEnd.toISOString(),
          status: 'upcoming'
        })

      if (error) throw error

      toast.success('Game created successfully!')
      navigate('/game')
    } catch (error) {
      console.error('Error creating game:', error)
      toast.error('Failed to create game')
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
