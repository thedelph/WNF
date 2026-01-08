import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../../../../types/game';

interface TeamAnnouncementDetailsProps {
  players: Player[];
  teamAPlayers: string[];
  teamBPlayers: string[];
  onTeamAPlayersChange: (players: string[]) => void;
  onTeamBPlayersChange: (players: string[]) => void;
}

/**
 * Component for handling team announcement details including team assignments and ratings
 */
export const TeamAnnouncementDetails: React.FC<TeamAnnouncementDetailsProps> = ({
  players,
  teamAPlayers,
  teamBPlayers,
  onTeamAPlayersChange,
  onTeamBPlayersChange,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* Orange Team */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Orange Team Players</legend>
          <select
            multiple
            value={teamAPlayers}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              onTeamAPlayersChange(selectedOptions);
            }}
            className="select h-48"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.friendly_name}
              </option>
            ))}
          </select>
        </fieldset>

        {/* Blue Team */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Blue Team Players</legend>
          <select
            multiple
            value={teamBPlayers}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              onTeamBPlayersChange(selectedOptions);
            }}
            className="select h-48"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.friendly_name}
              </option>
            ))}
          </select>
        </fieldset>
      </div>
    </motion.div>
  );
};

export default TeamAnnouncementDetails;
