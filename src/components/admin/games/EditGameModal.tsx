import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes } from 'react-icons/fa'
import { Game, Venue, GAME_STATUSES } from '../../../types/game'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { EditGameModalForm } from './modals/EditGameModalForm'
import { utcToUkTime, ukTimeToUtc } from '../../../utils/dateUtils'

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
      // Convert UTC times from database to UK timezone for display
      const gameDate = utcToUkTime(game.date)
      
      // Format date as YYYY-MM-DD for the date input
      setDate(gameDate.toISOString().split('T')[0])
      
      // Format time as HH:MM for the time input
      // Use local time methods to get the correct hour in UK timezone
      const hours = gameDate.getHours().toString().padStart(2, '0')
      const minutes = gameDate.getMinutes().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}`)
      
      // Format datetime-local inputs (YYYY-MM-DDTHH:MM)
      // These need special handling for the browser's datetime-local input
      
      // Registration start
      const regStart = utcToUkTime(game.registration_window_start)
      const regStartFormatted = formatDateTimeLocalValue(regStart)
      setRegistrationStart(regStartFormatted)
      
      // Registration end
      const regEnd = utcToUkTime(game.registration_window_end)
      const regEndFormatted = formatDateTimeLocalValue(regEnd)
      setRegistrationEnd(regEndFormatted)
      
      // Team announcement time
      if (game.team_announcement_time) {
        const teamAnnounce = utcToUkTime(game.team_announcement_time)
        const teamAnnounceFormatted = formatDateTimeLocalValue(teamAnnounce)
        setTeamAnnouncementTime(teamAnnounceFormatted)
      } else {
        setTeamAnnouncementTime('')
      }
      
      // Get venue ID directly from the game object
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
      // Convert current UK time to UTC for storage
      const currentUtcTime = ukTimeToUtc(new Date()).toISOString()
      
      await supabaseAdmin
        .from('games')
        .update({ 
          registration_window_end: currentUtcTime,
          status: GAME_STATUSES.PLAYERS_ANNOUNCED
        })
        .eq('id', game.id)

      await onSubmit({
        registration_window_end: currentUtcTime,
        status: GAME_STATUSES.PLAYERS_ANNOUNCED
      })

      toast.success('Registration window closed successfully!')
      onClose()
    } catch (error) {
      toast.error('Failed to close registration window')
      console.error(error)
    }
  }

  // Helper function to format Date objects for datetime-local inputs
  const formatDateTimeLocalValue = (date: Date): string => {
    // Format as YYYY-MM-DDTHH:MM which is required by datetime-local inputs
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Convert all UK times to UTC for storage in database
    // Create a Date object in UK time zone and then convert to UTC
    const gameDateTime = ukTimeToUtc(new Date(`${date}T${time}`)).toISOString()
    const regStart = ukTimeToUtc(new Date(registrationStart)).toISOString()
    const regEnd = ukTimeToUtc(new Date(registrationEnd)).toISOString()
    
    // Handle team announcement time (could be undefined)
    let teamAnnounceTime: string | undefined = undefined
    if (teamAnnouncementTime) {
      teamAnnounceTime = ukTimeToUtc(new Date(teamAnnouncementTime)).toISOString()
    }
    
    // Create the updated game object with correct types
    // Note: We use venue_id directly as that's what the database schema has
    const updatedGame: Partial<Game> = {
      date: gameDateTime,
      registration_window_start: regStart,
      registration_window_end: regEnd,
      team_announcement_time: teamAnnounceTime,
      venue_id: venueId, // Use venue_id directly to match database schema
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