import React, { useState } from 'react';
import { FaUser, FaUserClock } from 'react-icons/fa';
import { calculatePlayerXP } from '../../utils/calculatePlayerXP';
import { useUser } from '../../hooks/useUser';
import { handlePlayerSelfDropout } from '../../utils/dropoutHandler';
import { PlayerSelectionResultsProps } from '../../types/playerSelection';
import { toast } from 'react-hot-toast';
import { SlotOfferCountdown } from './SlotOfferCountdown';
import { useGamePlayers } from '../../hooks/useGamePlayers';
import { PlayerSelectionSection } from './PlayerSelectionSection';
import { ExtendedPlayerData, PlayerXPStats } from '../../types/player';

/**
 * Main component for displaying player selection results
 * Shows selected players, reserve players, and dropped out players
 */
export const PlayerSelectionResults: React.FC<PlayerSelectionResultsProps> = ({ gameId }) => {
  const [showSelected, setShowSelected] = useState(true);
  const [showReserves, setShowReserves] = useState(false);
  const [showDroppedOut, setShowDroppedOut] = useState(false);
  
  const { player } = useUser();
  const {
    selectedPlayers,
    reservePlayers,
    droppedOutPlayers,
    isLoading,
    gameDate,
    firstDropoutTime,
    refreshPlayers,
    gameData,
    activeSlotOffers
  } = useGamePlayers(gameId);

  // Check if the current user has dropped out
  const hasDroppedOut = droppedOutPlayers.some(p => p.id === player?.id);

  const handleDropout = async () => {
    try {
      if (!player?.id || !gameId) {
        toast.error('Unable to drop out: Missing player or game information');
        return;
      }
      
      await handlePlayerSelfDropout(player.id, gameId);
      await refreshPlayers();
    } catch (error) {
      console.error('Error dropping out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  // Calculate XP values for all players
  const allPlayers = [...selectedPlayers, ...reservePlayers, ...droppedOutPlayers];
  const allXpValues = allPlayers.map(player => {
    const xpStats: PlayerXPStats = {
      caps: player.stats?.caps || 0,
      activeBonuses: player.stats?.activeBonuses || 0,
      activePenalties: player.stats?.activePenalties || 0,
      currentStreak: player.stats?.currentStreak || 0,
      dropoutPenalties: player.stats?.dropoutPenalties || 0
    };
    return calculatePlayerXP(xpStats);
  });
  
  // Sort players by XP
  const sortedSelectedPlayers = [...selectedPlayers].sort((a, b) => {
    const xpStatsA: PlayerXPStats = {
      caps: a.stats?.caps || 0,
      activeBonuses: a.stats?.activeBonuses || 0,
      activePenalties: a.stats?.activePenalties || 0,
      currentStreak: a.stats?.currentStreak || 0,
      dropoutPenalties: a.stats?.dropoutPenalties || 0
    };
    const xpStatsB: PlayerXPStats = {
      caps: b.stats?.caps || 0,
      activeBonuses: b.stats?.activeBonuses || 0,
      activePenalties: b.stats?.activePenalties || 0,
      currentStreak: b.stats?.currentStreak || 0,
      dropoutPenalties: b.stats?.dropoutPenalties || 0
    };
    return calculatePlayerXP(xpStatsB) - calculatePlayerXP(xpStatsA);
  });

  const sortedReservePlayers = [...reservePlayers].sort((a, b) => {
    const xpStatsA: PlayerXPStats = {
      caps: a.stats?.caps || 0,
      activeBonuses: a.stats?.activeBonuses || 0,
      activePenalties: a.stats?.activePenalties || 0,
      currentStreak: a.stats?.currentStreak || 0,
      dropoutPenalties: a.stats?.dropoutPenalties || 0
    };
    const xpStatsB: PlayerXPStats = {
      caps: b.stats?.caps || 0,
      activeBonuses: b.stats?.activeBonuses || 0,
      activePenalties: b.stats?.activePenalties || 0,
      currentStreak: b.stats?.currentStreak || 0,
      dropoutPenalties: b.stats?.dropoutPenalties || 0
    };
    return calculatePlayerXP(xpStatsB) - calculatePlayerXP(xpStatsA);
  });

  return (
    <div className="space-y-4">
      <button
        onClick={handleDropout}
        className={`btn btn-sm ${hasDroppedOut ? 'btn-disabled bg-gray-500 text-white cursor-not-allowed' : 'btn-error'}`}
        disabled={hasDroppedOut}
      >
        {hasDroppedOut ? 'DROPPED OUT' : 'DROP OUT'}
      </button>

      <PlayerSelectionSection
        title="Selected Players"
        icon={FaUser}
        players={sortedSelectedPlayers}
        allXpValues={allXpValues}
        isExpanded={showSelected}
        onToggle={() => setShowSelected(!showSelected)}
      />

      <PlayerSelectionSection
        title="Reserve Players"
        icon={FaUserClock}
        players={sortedReservePlayers}
        allXpValues={allXpValues}
        isExpanded={showReserves}
        onToggle={() => setShowReserves(!showReserves)}
      >
        {(player: ExtendedPlayerData) => (
          gameDate && firstDropoutTime && (
            <div className="flex flex-col gap-1">
              <SlotOfferCountdown
                player={player}
                reservePlayers={sortedReservePlayers}
                gameDate={gameDate}
                firstDropoutTime={firstDropoutTime}
                hasActiveOffers={activeSlotOffers?.length > 0}
                selectedPlayersCount={selectedPlayers.length}
                maxPlayers={gameData?.max_players ?? 0}
              />
            </div>
          )
        )}
      </PlayerSelectionSection>

      <PlayerSelectionSection
        title="Dropped Out Players"
        icon={FaUser}
        players={droppedOutPlayers}
        allXpValues={allXpValues}
        isExpanded={showDroppedOut}
        onToggle={() => setShowDroppedOut(!showDroppedOut)}
      />
    </div>
  );
};