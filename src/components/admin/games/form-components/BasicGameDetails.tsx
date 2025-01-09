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
      <div className="form-control">
        <label className="label">
          <span className="label-text">Game Date</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
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
          onChange={(e) => onTimeChange(e.target.value)}
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
          onChange={(e) => onVenueChange(e.target.value)}
          className="select select-bordered"
          required
        >
          <option value="">Select a venue</option>
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
          onChange={(e) => onMaxPlayersChange(parseInt(e.target.value))}
          className="input input-bordered"
          required
          min="1"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Random Slots</span>
        </label>
        <input
          type="number"
          value={randomSlots}
          onChange={(e) => onRandomSlotsChange(parseInt(e.target.value))}
          className="input input-bordered"
          required
          min="0"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Pitch Cost (£)</span>
        </label>
        <input
          type="number"
          value={pitchCost}
          onChange={(e) => onPitchCostChange(parseFloat(e.target.value))}
          className="input input-bordered"
          required
          min="0"
          step="0.01"
        />
      </div>
    </div>
  );
};

export default BasicGameDetails;
