import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes } from 'react-icons/fa'
import { Game, Venue } from '../../../types/game'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { EditGameModalForm } from './modals/EditGameModalForm'

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
  const [teamAnnouncementTime, setTeamAnnouncementTime] = useState('')
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
      setTeamAnnouncementTime(game.team_announcement_time ? new Date(game.team_announcement_time).toISOString().slice(0, 16) : '')
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
      team_announcement_time: teamAnnouncementTime ? new Date(teamAnnouncementTime).toISOString() : null,
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

          <form onSubmit={handleSubmit} className="p-6">
            <EditGameModalForm
              game={game}
              venues={venues}
              date={date}
              time={time}
              registrationStart={registrationStart}
              registrationEnd={registrationEnd}
              teamAnnouncementTime={teamAnnouncementTime}
              venueId={venueId}
              maxPlayers={maxPlayers}
              randomSlots={randomSlots}
              onDateChange={setDate}
              onTimeChange={setTime}
              onRegistrationStartChange={setRegistrationStart}
              onRegistrationEndChange={setRegistrationEnd}
              onTeamAnnouncementTimeChange={setTeamAnnouncementTime}
              onVenueIdChange={setVenueId}
              onMaxPlayersChange={setMaxPlayers}
              onRandomSlotsChange={setRandomSlots}
            />

            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCloseRegistration}
                className="btn btn-warning"
              >
                Close Registration
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}