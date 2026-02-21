/**
 * Hook to check if the current logged-in user participated in a specific game
 * Used to gate the "Add Highlight" button
 */

import { useMemo } from 'react';
import { useUser } from './useUser';
import { GameDetailRegistration } from './useGameDetail';

interface UseIsGameParticipantReturn {
  isParticipant: boolean;
  playerId: string | null;
  playerTeam: 'blue' | 'orange' | null;
}

export const useIsGameParticipant = (
  registrations: GameDetailRegistration[] | undefined
): UseIsGameParticipantReturn => {
  const { player } = useUser();

  return useMemo(() => {
    if (!player?.id || !registrations) {
      return { isParticipant: false, playerId: null, playerTeam: null };
    }

    const registration = registrations.find(
      reg => reg.player.id === player.id && reg.status === 'selected'
    );

    if (!registration) {
      return { isParticipant: false, playerId: player.id, playerTeam: null };
    }

    return {
      isParticipant: true,
      playerId: player.id,
      playerTeam: registration.team,
    };
  }, [player?.id, registrations]);
};

export default useIsGameParticipant;
