import React from 'react';
import { PlayerListHeader } from './PlayerListHeader';
import { PlayerList } from './PlayerList';
import { ExtendedPlayerData } from '../../types/playerSelection';
import { IconType } from 'react-icons';

interface PlayerSelectionSectionProps {
  title: string;
  icon: IconType;
  players: ExtendedPlayerData[];
  allXpValues: number[];
  isExpanded: boolean;
  onToggle: () => void;
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
  allXpValues,
  isExpanded,
  onToggle,
  children
}) => {
  if (players.length === 0) return null;

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
        allXpValues={allXpValues}
      >
        {children}
      </PlayerList>
    </div>
  );
};
