import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../../../../types/game';

interface PlayerSelectionDetailsProps {
  players: Player[];
  confirmedPlayers: string[];
  reservePlayers: string[];
  randomPickPlayers: string[];
  droppedOutPlayers: string[];
  onConfirmedPlayersChange: (players: string[]) => void;
  onReservePlayersChange: (players: string[]) => void;
  onRandomPickPlayersChange: (players: string[]) => void;
  onDroppedOutPlayersChange: (players: string[]) => void;
}

/**
 * Component for handling player selection details including confirmed, reserve, random pick, and dropped out players
 */
export const PlayerSelectionDetails: React.FC<PlayerSelectionDetailsProps> = ({
  players,
  confirmedPlayers,
  reservePlayers,
  randomPickPlayers,
  droppedOutPlayers,
  onConfirmedPlayersChange,
  onReservePlayersChange,
  onRandomPickPlayersChange,
  onDroppedOutPlayersChange,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4"
    >
      {/* Selected Players Display */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Selected Players</span>
        </label>
        <select
          multiple
          value={confirmedPlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            onConfirmedPlayersChange(selectedOptions);
          }}
          className="select select-bordered h-32"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
        </select>
      </div>

      {/* Random Pick Players Display */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Random Pick Players</span>
        </label>
        <select
          multiple
          value={randomPickPlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            onRandomPickPlayersChange(selectedOptions);
          }}
          className="select select-bordered h-32"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
        </select>
      </div>

      {/* Reserve Players Display */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Reserve Players</span>
        </label>
        <select
          multiple
          value={reservePlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            onReservePlayersChange(selectedOptions);
          }}
          className="select select-bordered h-32"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
        </select>
      </div>

      {/* Dropped Out Players Display */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Dropped Out Players</span>
        </label>
        <select
          multiple
          value={droppedOutPlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            onDroppedOutPlayersChange(selectedOptions);
          }}
          className="select select-bordered h-32"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
        </select>
      </div>
    </motion.div>
  );
};

export default PlayerSelectionDetails;
