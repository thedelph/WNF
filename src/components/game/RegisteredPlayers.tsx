import React, { useState } from 'react';
import { useGlobalXP } from '../../hooks/useGlobalXP';
import { useGameRegistrationStats } from '../../hooks/useGameRegistrationStats';
import { RegisteredPlayerGrid } from './RegisteredPlayerGrid';
import { RegisteredPlayerListView } from './RegisteredPlayerListView';
import { ViewToggle } from '../games/views/ViewToggle';
import { Registration } from '../../types/playerSelection';

interface RegisteredPlayersProps {
  registrations: Registration[];
  maxPlayers?: number;
  randomSlots?: number;
}

/**
 * Component for displaying registered players in a game
 * Uses useGameRegistrationStats hook to fetch player data
 * Supports both grid and list views
 * 
 * @component
 * @param {Object} props
 * @param {Registration[]} props.registrations - Array of player registrations for the game
 * @param {number} [props.maxPlayers] - Maximum number of players for the game
 * @param {number} [props.randomSlots] - Number of random slots for player selection
 */
export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({
  registrations,
  maxPlayers = 18,
  randomSlots = 2
}) => {
  const [view, setView] = useState<'list' | 'card'>('card');
  // Fetch global XP values and registration stats
  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();
  const { loading, error, playerStats, stats } = useGameRegistrationStats(registrations);

  // Calculate the XP slots cutoff
  const xpSlots = maxPlayers - randomSlots;

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
    <div className="container mx-auto space-y-4">
      <div className="flex justify-center">
        <ViewToggle view={view} onViewChange={setView} />
      </div>
      {view === 'card' ? (
        <RegisteredPlayerGrid
          registrations={registrations}
          playerStats={playerStats}
          stats={stats}
        />
      ) : (
        <RegisteredPlayerListView
          registrations={registrations}
          playerStats={playerStats}
          stats={stats}
          xpSlots={xpSlots}
        />
      )}
    </div>
  );
};
