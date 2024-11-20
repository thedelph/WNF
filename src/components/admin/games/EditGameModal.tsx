import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers, FaLock, FaDice, FaQuestionCircle } from 'react-icons/fa'
import { Game, Venue } from '../../../types/game'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'

interface Props {
  game: Game
  venues: Venue[]
  onClose: () => void
  onSubmit: (updatedGame: Partial<Game>) => Promise<void>
}

export const EditGameModal: React.FC<Props> = ({
  game,
  venues,
  onClose,
  onSubmit,
}) => {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [registrationStart, setRegistrationStart] = useState('')
  const [registrationEnd, setRegistrationEnd] = useState('')
  const [venueId, setVenueId] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(0)
  const [randomSlots, setRandomSlots] = useState(2)

  useEffect(() => {
    if (game) {
      const gameDate = new Date(game.date)
      setDate(gameDate.toISOString().split('T')[0])
      setTime(gameDate.toTimeString().slice(0, 5))
      setRegistrationStart(new Date(game.registration_window_start).toISOString().slice(0, 16))
      setRegistrationEnd(new Date(game.registration_window_end).toISOString().slice(0, 16))
      setVenueId(game.venue_id)
      setMaxPlayers(game.max_players)
      setRandomSlots(game.random_slots || 2)
    }
  }, [game])

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCloseRegistration = async () => {
    try {
      await supabaseAdmin
        .from('games')
        .update({ 
          registration_window_end: new Date().toISOString(),
          status: 'pending_teams'
        })
        .eq('id', game.id)

      await onSubmit({
        registration_window_end: new Date().toISOString(),
        status: 'pending_teams'
      })

      toast.success('Registration window closed successfully!')
      onClose()
    } catch (error) {
      toast.error('Failed to close registration window')
      console.error(error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updatedGame: Partial<Game> = {
      date: new Date(`${date}T${time}`).toISOString(),
      registration_window_start: new Date(registrationStart).toISOString(),
      registration_window_end: new Date(registrationEnd).toISOString(),
      venue_id: venueId,
      max_players: maxPlayers,
      random_slots: randomSlots,
    }
    onSubmit(updatedGame)
  }

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleClickOutside}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-base-100 rounded-lg shadow-xl max-w-md w-full overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
        >
          <div className="flex justify-between items-center p-4 bg-primary text-primary-content">
            <h2 className="text-xl font-bold">Edit Game</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-circle"
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Game Date</span>
                <FaCalendarAlt className="text-base-content opacity-70" />
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
                <span className="label-text">Start Time</span>
                <FaClock className="text-base-content opacity-70" />
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
                <FaCalendarAlt className="text-base-content opacity-70" />
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
                <FaCalendarAlt className="text-base-content opacity-70" />
              </label>
              <input
                type="datetime-local"
                value={registrationEnd}
                onChange={(e) => setRegistrationEnd(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Venue</span>
                <FaMapMarkerAlt className="text-base-content opacity-70" />
              </label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="select select-bordered w-full"
                required
              >
                {venues.map(venue => (
                  <option key={venue.id} value={venue.id}>{venue.name}</option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Max Players</span>
                <FaUsers className="text-base-content opacity-70" />
              </label>
              <input
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="input input-bordered w-full"
                required
                min="1"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Random Selection Slots</span>
                <FaDice className="text-base-content opacity-70" />
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={randomSlots}
                  onChange={(e) => setRandomSlots(Number(e.target.value))}
                  className="input input-bordered w-full"
                  required
                  min="0"
                  max={maxPlayers}
                />
                <div className="tooltip" data-tip="Number of players to be selected randomly">
                  <button 
                    type="button" 
                    className="btn btn-circle btn-ghost btn-sm"
                  >
                    <FaQuestionCircle className="text-base-content opacity-70" />
                  </button>
                </div>
              </div>
              <label className="label">
                <span className="label-text-alt">
                  {maxPlayers - randomSlots} slots will be XP-based
                </span>
              </label>
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn btn-primary w-full"
              >
                Update Game
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleCloseRegistration}
                className="btn btn-warning w-full"
              >
                <FaLock className="mr-2" />
                Close Registration Now
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onClose}
                className="btn btn-ghost w-full"
              >
                Cancel
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}