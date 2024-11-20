import React from 'react'
import { motion } from 'framer-motion'
import { Venue } from '../../../types/game'
import FormContainer from '../../common/containers/FormContainer'

interface Props {
  venues: Venue[]
  onSubmit: (e: React.FormEvent) => Promise<void>
  date: string
  setDate: (date: string) => void
  time: string
  setTime: (time: string) => void
  registrationStart: string
  setRegistrationStart: (date: string) => void
  registrationEnd: string
  setRegistrationEnd: (date: string) => void
  venueId: string
  setVenueId: (id: string) => void
  maxPlayers: number
  setMaxPlayers: (num: number) => void
  randomSlots: number
  setRandomSlots: (num: number) => void
}

export const CreateGameForm: React.FC<Props> = ({
  venues,
  onSubmit,
  date,
  setDate,
  time,
  setTime,
  registrationStart,
  setRegistrationStart,
  registrationEnd,
  setRegistrationEnd,
  venueId,
  setVenueId,
  maxPlayers,
  setMaxPlayers,
  randomSlots,
  setRandomSlots
}) => {
  return (
    <FormContainer title="Create New Game">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Game Date</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input input-bordered"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Start Time</span>
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input input-bordered"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Registration Window Start</span>
          </label>
          <input
            type="datetime-local"
            value={registrationStart}
            onChange={(e) => setRegistrationStart(e.target.value)}
            className="input input-bordered"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Registration Window End</span>
          </label>
          <input
            type="datetime-local"
            value={registrationEnd}
            onChange={(e) => setRegistrationEnd(e.target.value)}
            className="input input-bordered"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Venue</span>
          </label>
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="select select-bordered"
            required
          >
            <option value="">Select a venue...</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Max Players</span>
          </label>
          <input
            type="number"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
            min={2}
            max={30}
            className="input input-bordered"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Random Slots</span>
          </label>
          <input
            type="number"
            value={randomSlots}
            onChange={(e) => setRandomSlots(parseInt(e.target.value))}
            min={0}
            max={maxPlayers}
            className="input input-bordered"
            required
          />
          <label className="label">
            <span className="label-text-alt">Number of slots to be assigned randomly</span>
          </label>
        </div>

        <motion.button
          type="submit"
          className="btn btn-primary w-full"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Create Game
        </motion.button>
      </form>
    </FormContainer>
  )
}
