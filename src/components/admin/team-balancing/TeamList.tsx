import React from 'react';
import { motion } from 'framer-motion';
import { calculateRarity } from '../../../utils/rarityCalculations';
import { ExtendedPlayerData } from '../../../types/playerSelection';

interface TeamAssignment {
  player_id: string;
  team: 'blue' | 'orange';
  friendly_name: string;
  attack_rating: number;
  defense_rating: number;
  xp: number;
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
  max_streak: number;
  win_rate: number;
  avatar_svg?: string;
}

interface TeamListProps {
  teamId: 'blue' | 'orange';
  team: TeamAssignment[];
  title: string;
  selectedPlayer: string | null;
  swapRankings: { [playerId: string]: number } | null;
  onPlayerSelect: (playerId: string) => void;
}

const PlayerCard = ({ 
  player, 
  teamId,
  isSelected,
  swapRank,
  onSelect
}: { 
  player: TeamAssignment;
  teamId: 'blue' | 'orange';
  isSelected: boolean;
  swapRank: number | null;
  onSelect: () => void;
}) => {
  // Determine button appearance based on swap rank
  const getButtonStyle = () => {
    if (isSelected) return 'btn-primary';
    if (swapRank !== null) return 'btn-success';
    return 'btn-ghost';
  };

  // Get background style based on swap rank
  const getBackgroundStyle = () => {
    if (isSelected) return 'bg-base-100 ring-2 ring-primary';
    if (swapRank !== null) return 'bg-base-100 bg-opacity-90 border-success border';
    return 'bg-base-100';
  };

  return (
    <div 
      className={`p-3 mb-2 rounded-lg shadow hover:shadow-md transition-all
        ${getBackgroundStyle()}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-medium">{player.friendly_name}</span>
              {swapRank !== null && !isSelected && (
                <span className="badge badge-success badge-sm">#{swapRank + 1}</span>
              )}
            </div>
            <div className="text-sm space-x-3">
              <span>Attack: {player.attack_rating}</span>
              <span>Defense: {player.defense_rating}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onSelect}
          className={`btn ${getButtonStyle()} btn-sm ml-4`}
          title={isSelected ? 'Deselect player' : swapRank !== null ? `Ranked #${swapRank + 1} swap` : 'Select player'}
        >
          {isSelected ? '✓' : '⇄'}
        </button>
      </div>
    </div>
  );
};

export function TeamList({ teamId, team, title, selectedPlayer, swapRankings, onPlayerSelect }: TeamListProps) {
  return (
    <div className="bg-base-200 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        {title} ({team.length})
      </h3>
      <div className="space-y-2">
        {team
          .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name))
          .map((player) => (
            <PlayerCard
              key={player.player_id}
              player={player}
              teamId={teamId}
              isSelected={selectedPlayer === player.player_id}
              swapRank={swapRankings ? swapRankings[player.player_id] ?? null : null}
              onSelect={() => onPlayerSelect(player.player_id)}
            />
          ))}
      </div>
    </div>
  );
}
