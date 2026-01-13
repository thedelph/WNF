import React, { useState } from 'react';
import { useGlobalXP } from '../../hooks/useGlobalXP';
import { useGameRegistrationStats } from '../../hooks/useGameRegistrationStats';
import { RegisteredPlayerGrid } from './RegisteredPlayerGrid';
import { RegisteredPlayerListView } from './RegisteredPlayerListView';
import { ViewToggle } from '../games/views/ViewToggle';
import { Registration } from '../../types/playerSelection';
import { SelectionProcessExplainer } from './SelectionProcessExplainer';

interface RegisteredPlayersProps {
  registrations: Registration[];
  maxPlayers?: number;
  randomSlots?: number;
  gameId?: string;
  isRegistrationOpen?: boolean;
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
 * @param {string} [props.gameId] - ID of the game for fetching token cooldown data
 */
export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({
  registrations,
  maxPlayers = 18,
  randomSlots = 2,
  gameId,
  isRegistrationOpen = false
}) => {
  const [view, setView] = useState<'list' | 'card'>('card');
  // Fetch global XP values and registration stats
  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();
  const { loading, error, playerStats, stats, tokenCooldownPlayerIds, unregisteredTokenHoldersCount, unregisteredPlayersXP } = useGameRegistrationStats(registrations, gameId);

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
      {/* Selection Process Explainer */}
      <div className="flex justify-center">
        <SelectionProcessExplainer />
      </div>

      <div className="flex justify-center">
        <ViewToggle view={view} onViewChange={setView} />
      </div>
      {view === 'card' ? (
        <RegisteredPlayerGrid
          registrations={registrations}
          playerStats={playerStats}
          stats={stats}
          tokenCooldownPlayerIds={tokenCooldownPlayerIds}
          xpSlots={xpSlots}
          maxPlayers={maxPlayers}
          unregisteredTokenHoldersCount={unregisteredTokenHoldersCount}
          unregisteredPlayersXP={unregisteredPlayersXP}
          isRegistrationOpen={isRegistrationOpen}
        />
      ) : (
        <RegisteredPlayerListView
          registrations={registrations}
          playerStats={playerStats}
          stats={stats}
          xpSlots={xpSlots}
          tokenCooldownPlayerIds={tokenCooldownPlayerIds}
          maxPlayers={maxPlayers}
          unregisteredTokenHoldersCount={unregisteredTokenHoldersCount}
          unregisteredPlayersXP={unregisteredPlayersXP}
        />
      )}

      {/* Shield Token Users Section - shows players who used shield for THIS game */}
      {(() => {
        const shieldUsers = registrations.filter(reg => reg.using_shield);
        if (shieldUsers.length === 0) return null;

        return (
          <div className="mt-6 bg-info/10 border border-info/30 rounded-lg p-4">
            <h3 className="font-bold text-base-content flex items-center gap-2 mb-3">
              <span className="text-lg">🛡️</span>
              Shield Token Users ({shieldUsers.length})
            </h3>
            <p className="text-sm text-base-content/70 mb-3">
              These players used their shield token to protect their streak for this game:
            </p>
            <div className="flex flex-wrap gap-2">
              {shieldUsers.map(reg => (
                <div key={reg.player.id} className="badge badge-info gap-2 py-3">
                  <span>🛡️</span>
                  <span>{reg.player.friendly_name}</span>
                  {playerStats[reg.player.id]?.protectedStreakValue && (
                    <span className="text-info-content/70">
                      ({playerStats[reg.player.id].protectedStreakValue} game streak protected)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Injury Token Users Section - shows players who used injury for THIS game */}
      {(() => {
        const injuryUsers = registrations.filter(reg => reg.using_injury);
        if (injuryUsers.length === 0) return null;

        return (
          <div className="mt-4 bg-warning/10 border border-warning/30 rounded-lg p-4">
            <h3 className="font-bold text-base-content flex items-center gap-2 mb-3">
              <span className="text-lg">🩹</span>
              Injured ({injuryUsers.length})
            </h3>
            <p className="text-sm text-base-content/70 mb-3">
              These players activated their injury token for this game (50% streak protection):
            </p>
            <div className="flex flex-wrap gap-2">
              {injuryUsers.map(reg => (
                <div key={reg.player.id} className="badge badge-warning gap-2 py-3">
                  <span>🩹</span>
                  <span>{reg.player.friendly_name}</span>
                  {playerStats[reg.player.id]?.injuryReturnStreak && (
                    <span className="text-warning-content/70">
                      (will return with {playerStats[reg.player.id].injuryReturnStreak} game streak)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
