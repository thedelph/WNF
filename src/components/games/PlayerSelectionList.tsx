import React from 'react';
import { ExtendedPlayerData } from '../../types/playerSelection';

interface PlayerSelectionListProps {
  players: ExtendedPlayerData[];
  title: string;
}

export const PlayerSelectionList: React.FC<PlayerSelectionListProps> = ({ players, title }) => {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">
        {title} ({players.length})
      </h2>
      <ul className="space-y-1">
        {players.map((player) => (
          <li key={player.id} className="p-2 bg-base-200 rounded">
            <span>
              {player.friendly_name || player.friendlyName} - XP: {player.xp || 0}
              {player.isRandomlySelected && ' (Random)'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlayerSelectionList;
