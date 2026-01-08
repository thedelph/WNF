import React from 'react';
import { Venue } from '../../../../types/game';

interface BasicGameDetailsProps {
  date: string;
  time: string;
  venueId: string;
  maxPlayers: number;
  randomSlots: number;
  pitchCost: number;
  venues: Venue[];
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onVenueChange: (value: string) => void;
  onMaxPlayersChange: (value: number) => void;
  onRandomSlotsChange: (value: number) => void;
  onPitchCostChange: (value: number) => void;
}

/**
 * Component for handling basic game details like date, time, venue, and player limits
 */
export const BasicGameDetails: React.FC<BasicGameDetailsProps> = ({
  date,
  time,
  venueId,
  maxPlayers,
  randomSlots,
  pitchCost,
  venues,
  onDateChange,
  onTimeChange,
  onVenueChange,
  onMaxPlayersChange,
  onRandomSlotsChange,
  onPitchCostChange,
}) => {
  return (
    <div className="space-y-4">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Game Date</legend>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="input"
          required
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Start Time</legend>
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="input"
          required
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Venue</legend>
        <select
          value={venueId}
          onChange={(e) => onVenueChange(e.target.value)}
          className="select"
          required
        >
          <option value="">Select a venue</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Max Players</legend>
        <input
          type="number"
          value={maxPlayers}
          onChange={(e) => onMaxPlayersChange(parseInt(e.target.value))}
          className="input"
          required
          min="1"
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Random Slots</legend>
        <input
          type="number"
          value={randomSlots}
          onChange={(e) => onRandomSlotsChange(parseInt(e.target.value))}
          className="input"
          required
          min="0"
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Pitch Cost (GBP)</legend>
        <input
          type="number"
          value={pitchCost}
          onChange={(e) => onPitchCostChange(parseFloat(e.target.value))}
          className="input"
          required
          min="0"
          step="0.01"
        />
      </fieldset>
    </div>
  );
};

export default BasicGameDetails;
