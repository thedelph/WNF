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
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Selected Players ({confirmedPlayers.length})</legend>
        <select
          multiple
          value={confirmedPlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            onConfirmedPlayersChange(selectedOptions);
          }}
          className="select h-32"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
        </select>
      </fieldset>

      {/* Random Pick Players Display */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Random Pick Players ({randomPickPlayers.length})</legend>
        <select
          multiple
          value={randomPickPlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            onRandomPickPlayersChange(selectedOptions);
          }}
          className="select h-32"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
        </select>
      </fieldset>

      {/* Reserve Players Display */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Reserve Players ({reservePlayers.length})</legend>
        <select
          multiple
          value={reservePlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            onReservePlayersChange(selectedOptions);
          }}
          className="select h-32"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
        </select>
      </fieldset>

      {/* Dropped Out Players Display */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Dropped Out Players ({droppedOutPlayers.length})</legend>
        <select
          multiple
          value={droppedOutPlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            onDroppedOutPlayersChange(selectedOptions);
          }}
          className="select h-32"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
        </select>
      </fieldset>
    </motion.div>
  );
};

export default PlayerSelectionDetails;
