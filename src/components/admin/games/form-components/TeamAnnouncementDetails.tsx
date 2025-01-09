import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../../../../types/game';

interface TeamAnnouncementDetailsProps {
  players: Player[];
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamAAttackRating: number;
  teamADefenseRating: number;
  teamBAttackRating: number;
  teamBDefenseRating: number;
  onTeamAPlayersChange: (players: string[]) => void;
  onTeamBPlayersChange: (players: string[]) => void;
  onTeamAAttackRatingChange: (rating: number) => void;
  onTeamADefenseRatingChange: (rating: number) => void;
  onTeamBAttackRatingChange: (rating: number) => void;
  onTeamBDefenseRatingChange: (rating: number) => void;
}

/**
 * Component for handling team announcement details including team assignments and ratings
 */
export const TeamAnnouncementDetails: React.FC<TeamAnnouncementDetailsProps> = ({
  players,
  teamAPlayers,
  teamBPlayers,
  teamAAttackRating,
  teamADefenseRating,
  teamBAttackRating,
  teamBDefenseRating,
  onTeamAPlayersChange,
  onTeamBPlayersChange,
  onTeamAAttackRatingChange,
  onTeamADefenseRatingChange,
  onTeamBAttackRatingChange,
  onTeamBDefenseRatingChange,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* Team A */}
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Team A Players</span>
            </label>
            <select
              multiple
              value={teamAPlayers}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                onTeamAPlayersChange(selectedOptions);
              }}
              className="select select-bordered h-48"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.friendly_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Attack Rating</span>
            </label>
            <input
              type="number"
              value={teamAAttackRating}
              onChange={(e) => onTeamAAttackRatingChange(parseInt(e.target.value))}
              className="input input-bordered"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Defense Rating</span>
            </label>
            <input
              type="number"
              value={teamADefenseRating}
              onChange={(e) => onTeamADefenseRatingChange(parseInt(e.target.value))}
              className="input input-bordered"
              required
            />
          </div>
        </div>

        {/* Team B */}
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Team B Players</span>
            </label>
            <select
              multiple
              value={teamBPlayers}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                onTeamBPlayersChange(selectedOptions);
              }}
              className="select select-bordered h-48"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.friendly_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Attack Rating</span>
            </label>
            <input
              type="number"
              value={teamBAttackRating}
              onChange={(e) => onTeamBAttackRatingChange(parseInt(e.target.value))}
              className="input input-bordered"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Defense Rating</span>
            </label>
            <input
              type="number"
              value={teamBDefenseRating}
              onChange={(e) => onTeamBDefenseRatingChange(parseInt(e.target.value))}
              className="input input-bordered"
              required
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TeamAnnouncementDetails;
