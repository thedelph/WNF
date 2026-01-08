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
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center justify-between w-full">
          <span>Game Date</span>
          <Tooltip content="Set the date when the game will be played">
            <FaCalendarAlt className="text-base-content opacity-70" />
          </Tooltip>
        </legend>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="input w-full"
          required
        />
      </fieldset>

      {/* Start Time */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center justify-between w-full">
          <span>Start Time</span>
          <Tooltip content="Set the time when the game will start">
            <FaClock className="text-base-content opacity-70" />
          </Tooltip>
        </legend>
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="input w-full"
          required
        />
      </fieldset>

      {/* Registration Start */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center justify-between w-full">
          <span>Registration Start</span>
          <Tooltip content="When players can start registering for the game">
            <FaCalendarAlt className="text-base-content opacity-70" />
          </Tooltip>
        </legend>
        <input
          type="datetime-local"
          value={registrationStart}
          onChange={(e) => onRegistrationStartChange(e.target.value)}
          className="input w-full"
          required
        />
      </fieldset>

      {/* Registration End */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center justify-between w-full">
          <span>Registration End</span>
          <Tooltip content="When registration will close">
            <FaCalendarAlt className="text-base-content opacity-70" />
          </Tooltip>
        </legend>
        <input
          type="datetime-local"
          value={registrationEnd}
          onChange={(e) => onRegistrationEndChange(e.target.value)}
          className="input w-full"
          required
        />
      </fieldset>

      {/* Team Announcement Time */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center justify-between w-full">
          <span>Team Announcement Time</span>
          <Tooltip content="When teams will be announced to players">
            <FaClock className="text-base-content opacity-70" />
          </Tooltip>
        </legend>
        <input
          type="datetime-local"
          value={teamAnnouncementTime}
          onChange={(e) => onTeamAnnouncementTimeChange(e.target.value)}
          className="input w-full"
          required
        />
      </fieldset>

      {/* Venue */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center justify-between w-full">
          <span>Venue</span>
          <Tooltip content="Select the venue where the game will be played">
            <FaMapMarkerAlt className="text-base-content opacity-70" />
          </Tooltip>
        </legend>
        <select
          value={venueId}
          onChange={(e) => onVenueIdChange(e.target.value)}
          className="select w-full"
          required
        >
          {venues.map(venue => (
            <option key={venue.id} value={venue.id}>{venue.name}</option>
          ))}
        </select>
      </fieldset>

      {/* Max Players */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center justify-between w-full">
          <span>Max Players</span>
          <Tooltip content="Maximum number of players that can register">
            <FaUsers className="text-base-content opacity-70" />
          </Tooltip>
        </legend>
        <input
          type="number"
          value={maxPlayers}
          onChange={(e) => onMaxPlayersChange(Number(e.target.value))}
          className="input w-full"
          required
          min="1"
        />
      </fieldset>

      {/* Random Selection Slots */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center justify-between w-full">
          <span>Random Selection Slots</span>
          <Tooltip content="Number of slots reserved for random selection">
            <FaDice className="text-base-content opacity-70" />
          </Tooltip>
        </legend>
        <input
          type="number"
          value={randomSlots}
          onChange={(e) => onRandomSlotsChange(Number(e.target.value))}
          className="input w-full"
          required
          min="0"
        />
      </fieldset>
    </div>
  );
};
