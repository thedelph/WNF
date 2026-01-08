import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Venue } from '../../../types/game';
import FormContainer from '../../common/containers/FormContainer';
import { supabase } from '../../../utils/supabase';
import toast from 'react-hot-toast';

interface Props {
  venues: Venue[];
  onPresetCreated: () => void;
}

const daysOfWeek = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export const VenuePresetForm: React.FC<Props> = ({ venues, onPresetCreated }) => {
  const [name, setName] = useState('');
  const [venueId, setVenueId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('wednesday');
  const [startTime, setStartTime] = useState('21:00');
  const [regHoursBefore, setRegHoursBefore] = useState(48);
  const [regHoursUntil, setRegHoursUntil] = useState(1);
  const [pitchCost, setPitchCost] = useState(50.00);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('venue_presets')
        .insert({
          name,
          venue_id: venueId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          registration_hours_before: regHoursBefore,
          registration_hours_until: regHoursUntil,
          pitch_cost: pitchCost
        });

      if (error) throw error;

      toast.success('Preset created successfully!');
      onPresetCreated();
      setName('');
    } catch (error) {
      toast.error('Failed to create preset');
      console.error(error);
    }
  };

  return (
    <FormContainer title="Create Venue Preset">
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Preset Name</legend>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g., Wednesday Night Football"
            required
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Venue</legend>
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="select"
            required
          >
            <option value="">Select a venue...</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Day of Week</legend>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            className="select"
            required
          >
            {daysOfWeek.map((day) => (
              <option key={day} value={day}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Start Time</legend>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input"
            required
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Registration Hours Before</legend>
          <input
            type="number"
            value={regHoursBefore}
            onChange={(e) => setRegHoursBefore(parseInt(e.target.value))}
            className="input"
            min={1}
            required
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Registration Hours Until</legend>
          <input
            type="number"
            value={regHoursUntil}
            onChange={(e) => setRegHoursUntil(parseInt(e.target.value))}
            className="input"
            min={1}
            required
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Pitch Cost (£)</legend>
          <input
            type="number"
            value={pitchCost}
            onChange={(e) => setPitchCost(parseFloat(e.target.value))}
            className="input"
            min={0}
            step={0.01}
            required
          />
          <p className="fieldset-label">Total cost for renting the pitch</p>
        </fieldset>

        <motion.button
          type="submit"
          className="btn btn-primary w-full"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Create Preset
        </motion.button>
      </form>
    </FormContainer>
  );
};
