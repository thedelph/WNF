import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../../../../types/game';

interface PlayerSelectionDetailsProps {
  players: Player[];
  confirmedPlayers: string[];
  reservePlayers: string[];
  randomPickPlayers: string[];
  droppedOutPlayers: string[];
  shieldPlayers: string[];
  injuryPlayers: string[];
  onConfirmedPlayersChange: (players: string[]) => void;
  onReservePlayersChange: (players: string[]) => void;
  onRandomPickPlayersChange: (players: string[]) => void;
  onDroppedOutPlayersChange: (players: string[]) => void;
  onShieldPlayersChange: (players: string[]) => void;
  onInjuryPlayersChange: (players: string[]) => void;
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
  shieldPlayers,
  injuryPlayers,
  onConfirmedPlayersChange,
  onReservePlayersChange,
  onRandomPickPlayersChange,
  onDroppedOutPlayersChange,
  onShieldPlayersChange,
  onInjuryPlayersChange,
}) => {
  // Get player name by ID for display
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.friendly_name || 'Unknown';
  };
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

      {/* Shield Token Users */}
      <fieldset className="fieldset bg-info/10 border border-info/30 rounded-lg p-4">
        <legend className="fieldset-legend flex items-center gap-2">
          <span>🛡️</span>
          <span>Shield Token Users ({shieldPlayers.length})</span>
        </legend>
        <p className="text-sm text-base-content/70 mb-3">
          Select players who used their shield token to protect their streak
        </p>
        <select
          multiple
          value={shieldPlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            // Remove any players that are in injury list
            const filteredOptions = selectedOptions.filter(id => !injuryPlayers.includes(id));
            onShieldPlayersChange(filteredOptions);
          }}
          className="select h-32 w-full"
        >
          {players
            .filter(player => !injuryPlayers.includes(player.id))
            .map((player) => (
              <option key={player.id} value={player.id}>
                {player.friendly_name}
              </option>
            ))}
        </select>
        {shieldPlayers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {shieldPlayers.map(playerId => (
              <span key={playerId} className="badge badge-info gap-1">
                🛡️ {getPlayerName(playerId)}
                <button
                  type="button"
                  className="btn btn-ghost btn-xs px-1"
                  onClick={() => onShieldPlayersChange(shieldPlayers.filter(id => id !== playerId))}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </fieldset>

      {/* Injury Token Users */}
      <fieldset className="fieldset bg-warning/10 border border-warning/30 rounded-lg p-4">
        <legend className="fieldset-legend flex items-center gap-2">
          <span>🩹</span>
          <span>Injury Reserve ({injuryPlayers.length})</span>
        </legend>
        <p className="text-sm text-base-content/70 mb-3">
          Select players on injury reserve (50% streak protection). This will activate their injury token.
        </p>
        <select
          multiple
          value={injuryPlayers}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            // Remove any players that are in shield list
            const filteredOptions = selectedOptions.filter(id => !shieldPlayers.includes(id));
            onInjuryPlayersChange(filteredOptions);
          }}
          className="select h-32 w-full"
        >
          {players
            .filter(player => !shieldPlayers.includes(player.id))
            .map((player) => (
              <option key={player.id} value={player.id}>
                {player.friendly_name}
              </option>
            ))}
        </select>
        {injuryPlayers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {injuryPlayers.map(playerId => (
              <span key={playerId} className="badge badge-warning gap-1">
                🩹 {getPlayerName(playerId)}
                <button
                  type="button"
                  className="btn btn-ghost btn-xs px-1"
                  onClick={() => onInjuryPlayersChange(injuryPlayers.filter(id => id !== playerId))}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </fieldset>
    </motion.div>
  );
};

export default PlayerSelectionDetails;
