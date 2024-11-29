import React from 'react'
import { motion } from 'framer-motion'
import { Venue } from '../../../types/game'
import FormContainer from '../../common/containers/FormContainer'
import toast from 'react-hot-toast'

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
  pitchCost: number
  setPitchCost: (cost: number) => void
  teamAnnouncementTime: string
  setTeamAnnouncementTime: (date: string) => void
  presets: {
    id: string;
    name: string;
    venue_id: string;
    day_of_week: string;
    start_time: string;
    registration_hours_before: number;
    registration_hours_until: number;
    pitch_cost: number;
  }[];
  onPresetSelect: (presetId: string) => void;
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
  setRandomSlots,
  pitchCost,
  setPitchCost,
  teamAnnouncementTime,
  setTeamAnnouncementTime,
  presets,
  onPresetSelect
}) => {
  return (
    <FormContainer title="Create New Game">
      <form onSubmit={onSubmit} className="space-y-4">
        {presets && presets.length > 0 && (
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Quick Setup</span>
            </label>
            <select
              onChange={(e) => onPresetSelect(e.target.value)}
              className="select select-bordered"
            >
              <option value="">Choose a preset...</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
            <button 
              type="button"
              className="btn btn-xs"
              onClick={() => setRegistrationStart(new Date().toISOString().slice(0, 16))}
            >
              Set to Now
            </button>
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
            <button 
              type="button"
              className="btn btn-xs"
              onClick={() => {
                const oneMinuteFromNow = new Date(Date.now() + 60000);
                setRegistrationEnd(oneMinuteFromNow.toISOString().slice(0, 16));
              }}
            >
              1 Min from Now
            </button>
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
            <span className="label-text">Team Announcement Time</span>
            <button
              type="button"
              className="btn btn-xs"
              onClick={() => {
                if (!date || !time) {
                  toast.error('Please set game date and time first');
                  return;
                }
                try {
                  const gameDateTime = new Date(`${date}T${time}`);
                  if (isNaN(gameDateTime.getTime())) {
                    toast.error('Invalid game date or time');
                    return;
                  }
                  const announcementTime = new Date(gameDateTime);
                  announcementTime.setHours(announcementTime.getHours() - 4);
                  setTeamAnnouncementTime(announcementTime.toISOString().slice(0, 16));
                } catch (error) {
                  console.error('Error setting team announcement time:', error);
                  toast.error('Failed to set team announcement time');
                }
              }}
            >
              4H Before Game
            </button>
          </label>
          <input
            type="datetime-local"
            value={teamAnnouncementTime}
            onChange={(e) => setTeamAnnouncementTime(e.target.value)}
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

        <div className="form-control">
          <label className="label">
            <span className="label-text">Pitch Cost (£)</span>
          </label>
          <input
            type="number"
            value={pitchCost}
            onChange={(e) => setPitchCost(parseFloat(e.target.value))}
            min={0}
            step={0.01}
            className="input input-bordered"
            required
          />
          <label className="label">
            <span className="label-text-alt">Total cost for renting the pitch</span>
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
