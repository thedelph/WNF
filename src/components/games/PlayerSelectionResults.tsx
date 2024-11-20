import React from 'react';
import { FaUser, FaUserClock } from 'react-icons/fa';

interface Player {
  id: string;
  friendly_name: string;
  isRandomlySelected?: boolean;
}

interface PlayerSelectionResultsProps {
  selectedPlayers: Player[];
  reservePlayers: Player[];
}

export const PlayerSelectionResults: React.FC<PlayerSelectionResultsProps> = ({
  selectedPlayers,
  reservePlayers
}) => {
  console.log('PlayerSelectionResults props:', { selectedPlayers, reservePlayers });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-3">
          Selected Players ({selectedPlayers.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedPlayers.map(player => (
            <div 
              key={player.id}
              className="p-3 bg-white rounded-lg shadow-sm border border-green-200"
            >
              <p className="font-medium text-gray-900">
                {player.friendly_name}
                {player.isRandomlySelected && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Random
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3">
          Reserve Players ({reservePlayers.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reservePlayers.map(player => (
            <div 
              key={player.id}
              className="p-3 bg-white rounded-lg shadow-sm border border-yellow-200"
            >
              <p className="font-medium text-gray-900">
                {player.friendly_name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};