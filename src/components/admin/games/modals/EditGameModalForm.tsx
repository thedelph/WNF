import React from 'react';
import { Game, Venue } from '../../../../types/game';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers, FaDice } from 'react-icons/fa';
import { Tooltip } from '../../../ui/Tooltip';

interface Props {
  game: Game;
  venues: Venue[];
  date: string;
  time: string;
  registrationStart: string;
  registrationEnd: string;
  teamAnnouncementTime: string;
  venueId: string;
  maxPlayers: number;
  randomSlots: number;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onRegistrationStartChange: (value: string) => void;
  onRegistrationEndChange: (value: string) => void;
  onTeamAnnouncementTimeChange: (value: string) => void;
  onVenueIdChange: (value: string) => void;
  onMaxPlayersChange: (value: number) => void;
  onRandomSlotsChange: (value: number) => void;
}

export const EditGameModalForm: React.FC<Props> = ({
  venues,
  date,
  time,
  registrationStart,
  registrationEnd,
  teamAnnouncementTime,
  venueId,
  maxPlayers,
  randomSlots,
  onDateChange,
  onTimeChange,
  onRegistrationStartChange,
  onRegistrationEndChange,
  onTeamAnnouncementTimeChange,
  onVenueIdChange,
  onMaxPlayersChange,
  onRandomSlotsChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Game Date */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Game Date</span>
          <Tooltip content="Set the date when the game will be played">
            <FaCalendarAlt className="text-base-content opacity-70" />
          </Tooltip>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </div>

      {/* Start Time */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Start Time</span>
          <Tooltip content="Set the time when the game will start">
            <FaClock className="text-base-content opacity-70" />
          </Tooltip>
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </div>

      {/* Registration Start */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Registration Start</span>
          <Tooltip content="When players can start registering for the game">
            <FaCalendarAlt className="text-base-content opacity-70" />
          </Tooltip>
        </label>
        <input
          type="datetime-local"
          value={registrationStart}
          onChange={(e) => onRegistrationStartChange(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </div>

      {/* Registration End */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Registration End</span>
          <Tooltip content="When registration will close">
            <FaCalendarAlt className="text-base-content opacity-70" />
          </Tooltip>
        </label>
        <input
          type="datetime-local"
          value={registrationEnd}
          onChange={(e) => onRegistrationEndChange(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </div>

      {/* Team Announcement Time */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Team Announcement Time</span>
          <Tooltip content="When teams will be announced to players">
            <FaClock className="text-base-content opacity-70" />
          </Tooltip>
        </label>
        <input
          type="datetime-local"
          value={teamAnnouncementTime}
          onChange={(e) => onTeamAnnouncementTimeChange(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </div>

      {/* Venue */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Venue</span>
          <Tooltip content="Select the venue where the game will be played">
            <FaMapMarkerAlt className="text-base-content opacity-70" />
          </Tooltip>
        </label>
        <select
          value={venueId}
          onChange={(e) => onVenueIdChange(e.target.value)}
          className="select select-bordered w-full"
          required
        >
          {venues.map(venue => (
            <option key={venue.id} value={venue.id}>{venue.name}</option>
          ))}
        </select>
      </div>

      {/* Max Players */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Max Players</span>
          <Tooltip content="Maximum number of players that can register">
            <FaUsers className="text-base-content opacity-70" />
          </Tooltip>
        </label>
        <input
          type="number"
          value={maxPlayers}
          onChange={(e) => onMaxPlayersChange(Number(e.target.value))}
          className="input input-bordered w-full"
          required
          min="1"
        />
      </div>

      {/* Random Selection Slots */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Random Selection Slots</span>
          <Tooltip content="Number of slots reserved for random selection">
            <FaDice className="text-base-content opacity-70" />
          </Tooltip>
        </label>
        <input
          type="number"
          value={randomSlots}
          onChange={(e) => onRandomSlotsChange(Number(e.target.value))}
          className="input input-bordered w-full"
          required
          min="0"
        />
      </div>
    </div>
  );
};
