import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Venue } from '../../../types/game';
import FormContainer from '../../common/containers/FormContainer';
import toast from 'react-hot-toast';
import { supabase } from '../../../utils/supabase';

interface CreateGameFormProps {
  date?: string;
  time?: string;
  venueId?: string;
  pitchCost?: number;
  registrationStart?: string;
  registrationEnd?: string;
  teamAnnouncementTime?: string;
  onGameCreated?: () => void;
}

export const CreateGameForm: React.FC<CreateGameFormProps> = ({
  date: presetDate,
  time: presetTime,
  venueId: presetVenueId,
  pitchCost: presetPitchCost,
  registrationStart: presetRegistrationStart,
  registrationEnd: presetRegistrationEnd,
  teamAnnouncementTime: presetTeamAnnouncementTime,
  onGameCreated,
}) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [date, setDate] = useState(presetDate || '');
  const [time, setTime] = useState(presetTime || '21:00');
  const [registrationStart, setRegistrationStart] = useState(presetRegistrationStart || '');
  const [registrationEnd, setRegistrationEnd] = useState(presetRegistrationEnd || '');
  const [teamAnnouncementTime, setTeamAnnouncementTime] = useState(presetTeamAnnouncementTime || '');
  const [venueId, setVenueId] = useState(presetVenueId || '');
  const [maxPlayers, setMaxPlayers] = useState(18);
  const [randomSlots, setRandomSlots] = useState(2);
  const [pitchCost, setPitchCost] = useState(presetPitchCost || 0);

  useEffect(() => {
    fetchVenues();
  }, []);

  // Update form when preset values change
  useEffect(() => {
    if (presetDate) setDate(presetDate);
    if (presetTime) setTime(presetTime);
    if (presetVenueId) setVenueId(presetVenueId);
    if (presetPitchCost) setPitchCost(presetPitchCost);
    if (presetRegistrationStart) setRegistrationStart(presetRegistrationStart);
    if (presetRegistrationEnd) setRegistrationEnd(presetRegistrationEnd);
    if (presetTeamAnnouncementTime) setTeamAnnouncementTime(presetTeamAnnouncementTime);
  }, [presetDate, presetTime, presetVenueId, presetPitchCost, presetRegistrationStart, presetRegistrationEnd, presetTeamAnnouncementTime]);

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to fetch venues');
      return;
    }

    setVenues(data || []);
    if (data?.length > 0) {
      const defaultVenue = data.find(v => v.is_default) || data[0];
      setVenueId(defaultVenue.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const gameDate = new Date(`${date}T${time}`);
      const regStart = new Date(registrationStart);
      const regEnd = new Date(registrationEnd);
      const teamAnnounce = new Date(teamAnnouncementTime);
      const now = new Date();

      // Validate dates
      if (regStart >= regEnd) {
        toast.error('Registration start must be before registration end');
        return;
      }

      if (gameDate <= regEnd) {
        toast.error('Game date must be after registration end');
        return;
      }

      if (teamAnnounce <= regEnd) {
        toast.error('Team announcement must be after registration end');
        return;
      }

      if (teamAnnounce >= gameDate) {
        toast.error('Team announcement must be before game start');
        return;
      }

      // Determine initial status
      let initialStatus = 'upcoming';
      if (now >= regStart && now < regEnd) {
        initialStatus = 'open';
      }

      const { error } = await supabase
        .from('games')
        .insert({
          date: gameDate.toISOString(),
          registration_window_start: regStart.toISOString(),
          registration_window_end: regEnd.toISOString(),
          team_announcement_time: teamAnnounce.toISOString(),
          venue_id: venueId,
          max_players: maxPlayers,
          random_slots: randomSlots,
          pitch_cost: pitchCost,
          status: initialStatus,
          teams_announced: false
        });

      if (error) throw error;

      toast.success('Game created successfully!');
      
      // Reset form
      setDate('');
      setTime('21:00');
      setRegistrationStart('');
      setRegistrationEnd('');
      setTeamAnnouncementTime('');
      setMaxPlayers(18);
      setRandomSlots(2);
      setPitchCost(0);

      // Notify parent component
      onGameCreated?.();
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
    }
  };

  return (
    <FormContainer title="Create New Game">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            min={1}
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
};
