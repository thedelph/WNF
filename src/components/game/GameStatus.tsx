import React from 'react';
import { Game } from '../../types/game';
import { RegisteredPlayers } from './RegisteredPlayers';
import { PlayerSelectionResults } from '../games/PlayerSelectionResults';
import { TeamSelectionResults } from '../games/TeamSelectionResults';
import { LoadingSpinner } from '../LoadingSpinner';

interface GameStatusProps {
  game: Game | null;
  isLoading: boolean;
  isProcessingOpen: boolean;
  isProcessingClose: boolean;
  isTeamAnnouncementTime: boolean;
  registrations: any[];
  selectedPlayers: any[];
  reservePlayers: any[];
}

export const GameStatus: React.FC<GameStatusProps> = ({
  game,
  isLoading,
  isProcessingOpen,
  isProcessingClose,
  isTeamAnnouncementTime,
  registrations,
  selectedPlayers,
  reservePlayers,
}) => {
  if (isProcessingOpen || isProcessingClose || isTeamAnnouncementTime || isLoading) {
    return <LoadingSpinner />;
  }

  if (!game) {
    return null;
  }

  switch (game.status) {
    case 'open':
    case 'upcoming':
      return <RegisteredPlayers registrations={registrations} />;
    case 'players_announced':
      return <PlayerSelectionResults gameId={game.id} />;
    case 'teams_announced':
    case 'completed':
      return (
        <TeamSelectionResults 
          key={`team-selection-${selectedPlayers.length}`}
          gameId={game.id}
          selectedPlayers={selectedPlayers}
          reservePlayers={reservePlayers}
        />
      );
    default:
      return null;
  }
};
