import React from 'react';
import { FaUser, FaUserClock, FaDice } from 'react-icons/fa';
import { calculatePlayerXP, PlayerStats } from '../../utils/xpCalculations';

interface Player {
  id: string;
  friendly_name: string;
  isRandomlySelected?: boolean;
  xp: number;
  stats?: PlayerStats;
}

interface PlayerSelectionResultsProps {
  selectedPlayers: Player[];
  reservePlayers: Player[];
}

export const PlayerSelectionResults: React.FC<PlayerSelectionResultsProps> = ({
  selectedPlayers,
  reservePlayers
}) => {
  const getCalculatedXP = (player: Player): number => {
    if (!player.stats) return player.xp;
    return calculatePlayerXP(player.stats);
  };

  // Sort by calculated XP instead of stored XP
  const sortedSelectedPlayers = [...selectedPlayers].sort(
    (a, b) => getCalculatedXP(b) - getCalculatedXP(a)
  );
  
  const sortedReservePlayers = [...reservePlayers].sort(
    (a, b) => getCalculatedXP(b) - getCalculatedXP(a)
  );

  const meritBasedPlayers = selectedPlayers.filter(p => !p.isRandomlySelected);
  const lowestMeritXP = meritBasedPlayers.length > 0 
    ? Math.min(...meritBasedPlayers.map(getCalculatedXP))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <FaUser className="text-green-500" />
          Selected Players ({selectedPlayers.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSelectedPlayers.map(player => (
            <div 
              key={player.id}
              className={`p-3 rounded-lg shadow-sm border flex justify-between items-center
                ${player.isRandomlySelected 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-green-50 border-green-200'
                }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">
                    {player.friendly_name}
                  </p>
                  {player.isRandomlySelected && (
                    <span className="text-blue-500 text-sm">
                      (Random)
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  XP: {getCalculatedXP(player).toFixed(1)}
                  {player.stats && (
                    <span className="text-xs text-gray-500 ml-1">
                      (Caps: {player.stats.caps}, 
                      Bonus: {player.stats.activeBonuses}, 
                      Pen: {player.stats.activePenalties}, 
                      Streak: {player.stats.currentStreak})
                    </span>
                  )}
                </p>
              </div>
              {player.isRandomlySelected && (
                <span className="text-blue-500">
                  <FaDice title="Randomly Selected" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <FaUserClock className="text-yellow-500" />
          Reserve List ({reservePlayers.length})
          {lowestMeritXP > 0 && (
            <span className="text-sm font-normal text-gray-600">
              (Need {lowestMeritXP} XP for guaranteed selection)
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedReservePlayers.map(player => (
            <div 
              key={player.id}
              className="p-3 bg-yellow-50 rounded-lg shadow-sm border border-yellow-200"
            >
              <p className="font-medium text-gray-900">
                {player.friendly_name}
              </p>
              <p className="text-sm text-gray-600">
                XP: {getCalculatedXP(player).toFixed(1)}
                {player.stats && (
                  <span className="text-xs text-gray-500 ml-1">
                    (Caps: {player.stats.caps}, 
                    Bonus: {player.stats.activeBonuses}, 
                    Pen: {player.stats.activePenalties}, 
                    Streak: {player.stats.currentStreak})
                  </span>
                )}
                {lowestMeritXP > 0 && (
                  <span className="text-gray-500 ml-2">
                    ({(lowestMeritXP - getCalculatedXP(player)).toFixed(1)} XP needed)
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};