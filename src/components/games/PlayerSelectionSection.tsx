import React from 'react';
import { PlayerListHeader } from './PlayerListHeader';
import { PlayerList } from './PlayerList';
import { ExtendedPlayerData } from '../../types/playerSelection';
import { IconType } from 'react-icons';

interface PlayerSelectionSectionProps {
  title: string;
  icon: IconType;
  players: ExtendedPlayerData[];
  isExpanded: boolean;
  onToggle: () => void;
  renderPlayerExtra?: (player: ExtendedPlayerData) => React.ReactNode;
  children?: (player: ExtendedPlayerData) => React.ReactNode;
}

/**
 * Component that combines PlayerListHeader and PlayerList
 * Used for each section of players (selected, reserve, dropped out)
 */
export const PlayerSelectionSection: React.FC<PlayerSelectionSectionProps> = ({
  title,
  icon,
  players,
  isExpanded,
  onToggle,
  renderPlayerExtra,
  children
}) => {
  if (players.length === 0) return null;

  // Use children as render function if provided, otherwise use renderPlayerExtra
  const playerRenderer = children || renderPlayerExtra;

  return (
    <div className="flex flex-col space-y-4">
      <PlayerListHeader
        icon={icon}
        title={title}
        count={players.length}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
      <PlayerList
        players={players}
        isExpanded={isExpanded}
        renderPlayerExtra={playerRenderer}
      />
    </div>
  );
};
