import React from 'react';
import { useGlobalXP } from '../../hooks/useGlobalXP';
import { useGameRegistrationStats } from '../../hooks/useGameRegistrationStats';
import { RegisteredPlayerGrid } from './RegisteredPlayerGrid';
import { Registration } from '../../types/playerSelection';

interface RegisteredPlayersProps {
  registrations: Registration[];
}

/**
 * Component for displaying registered players in a game
 * Uses useGameRegistrationStats hook to fetch player data
 * and RegisteredPlayerGrid for layout
 * 
 * @component
 * @param {Object} props
 * @param {Registration[]} props.registrations - Array of player registrations for the game
 */
export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({
  registrations
}) => {
  // Fetch global XP values and registration stats
  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();
  const { loading, error, playerStats, stats } = useGameRegistrationStats(registrations);

  // Show loading spinner while data is being fetched
  if (loading || globalXpLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  // Show error message if data fetching fails
  if (error || globalXpError) {
    return (
      <div className="text-center text-error p-4">
        <p>{error || globalXpError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RegisteredPlayerGrid
        registrations={registrations}
        playerStats={playerStats}
        stats={stats}
      />
    </div>
  );
};
