import React, { useState } from 'react';
import { Game } from '../../types/game';
import { RegisteredPlayers } from './RegisteredPlayers';
import { PlayerSelectionResults } from '../games/PlayerSelectionResults';
import { TeamSelectionResults } from '../games/TeamSelectionResults';
import { LoadingSpinner } from '../LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

interface GameStatusProps {
  game: Game | null;
  isLoading: boolean;
  isProcessingOpen: boolean;
  isProcessingClose: boolean;
  isTeamAnnouncementTime: boolean;
  registrations: any[];
  selectedPlayers: any[];
  reservePlayers: any[];
  isUserRegistered: boolean;
  handleRegistration: () => Promise<void>;
  isRegistrationClosed: boolean;
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
  isUserRegistered,
  handleRegistration,
  isRegistrationClosed,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterClick = async () => {
    try {
      setIsRegistering(true);
      await handleRegistration();
    } catch (error) {
      console.error('Error handling registration:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  if (isProcessingOpen || isProcessingClose || isTeamAnnouncementTime || isLoading) {
    return <LoadingSpinner />;
  }

  if (!game) {
    return null;
  }

  switch (game.status) {
    case 'open':
    case 'upcoming':
      return (
        <RegisteredPlayers
          registrations={registrations}
          maxPlayers={game.max_players}
          randomSlots={game.random_slots}
          gameId={game.id}
        />
      );
    case 'players_announced':
      return <PlayerSelectionResults gameId={game.id} />;
    case 'teams_announced':
    case 'completed':
      return (
        <TeamSelectionResults
          key={`team-selection-${selectedPlayers.length}`}
          gameId={game.id}
        />
      );
    default:
      return null;
  }
};
