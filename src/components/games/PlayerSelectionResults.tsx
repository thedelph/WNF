import React, { useState } from 'react';
import { FaUser, FaUserClock } from 'react-icons/fa';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import { useUser } from '../../hooks/useUser';
import { handlePlayerSelfDropout } from '../../utils/dropoutHandler';
import { PlayerSelectionResultsProps } from '../../types/playerSelection';
import { toast } from 'react-hot-toast';
import { SlotOfferCountdown } from './SlotOfferCountdown';
import { useGamePlayers } from '../../hooks/useGamePlayers';
import { PlayerSelectionSection } from './PlayerSelectionSection';
import { supabase } from '../../utils/supabase';
import { ViewToggle } from './views/ViewToggle';
import { PlayerListView } from './views/PlayerListView';

/**
 * Main component for displaying player selection results
 * Shows selected players, reserve players, and dropped out players
 */
export const PlayerSelectionResults: React.FC<PlayerSelectionResultsProps> = ({ gameId }) => {
  const [showSelected, setShowSelected] = useState(true);
  const [showReserves, setShowReserves] = useState(false);
  const [showDroppedOut, setShowDroppedOut] = useState(false);
  const [view, setView] = useState<'list' | 'card'>('card');
  
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

  // Check various player states
  const hasDroppedOut = droppedOutPlayers.some(p => p.id === player?.id);
  const isRegistered = [...selectedPlayers, ...reservePlayers].some(p => p.id === player?.id);
  const shouldShowButton = isRegistered || hasDroppedOut;
  const isRegistrationOpen = gameData?.status === 'open';

  const handleRegistrationToggle = async () => {
    try {
      if (!player?.id || !gameId) {
        toast.error('Unable to process: Missing player or game information');
        return;
      }

      const { data: existingReg } = await supabase
        .from('game_registrations')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_id', player.id)
        .single();

      if (existingReg) {
        // Unregister
        await supabase
          .from('game_registrations')
          .delete()
          .eq('game_id', gameId)
          .eq('player_id', player.id);
      } else {
        // Register
        await supabase
          .from('game_registrations')
          .insert({
            game_id: gameId,
            player_id: player.id,
            status: 'registered'
          });
      }

      await refreshPlayers();
      toast.success(existingReg ? 'Successfully unregistered' : 'Successfully registered');
    } catch (error) {
      console.error('Error toggling registration:', error);
      toast.error('Failed to process registration');
    }
  };

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

  // Determine button properties based on game and player state
  const getButtonProps = () => {
    if (isRegistrationOpen) {
      // During registration window
      return {
        onClick: handleRegistrationToggle,
        className: `btn btn-sm ${isRegistered ? 'btn-error' : 'btn-success'}`,
        text: isRegistered ? 'UNREGISTER INTEREST' : 'REGISTER INTEREST',
        show: true
      };
    } else {
      // After registration closes
      return {
        onClick: handleDropout,
        className: `btn btn-sm ${hasDroppedOut ? 'btn-disabled bg-gray-500 text-white cursor-not-allowed' : 'btn-error'}`,
        text: hasDroppedOut ? 'DROPPED OUT' : 'DROP OUT',
        show: shouldShowButton
      };
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
  const allXpValues = allPlayers.map(player => calculatePlayerXP(player.stats));
  
  // Sort players by XP
  const sortedSelectedPlayers = [...selectedPlayers].sort((a, b) => {
    const xpA = calculatePlayerXP(a.stats);
    const xpB = calculatePlayerXP(b.stats);
    return xpB - xpA;
  });

  const sortedReservePlayers = [...reservePlayers].sort((a, b) => {
    const xpA = calculatePlayerXP(a.stats);
    const xpB = calculatePlayerXP(b.stats);
    return xpB - xpA;
  });

  return (
    <div className="space-y-4">
      {player?.id && (
        <button
          onClick={getButtonProps().onClick}
          className={getButtonProps().className}
          style={{ display: getButtonProps().show ? 'block' : 'none' }}
        >
          {getButtonProps().text}
        </button>
      )}

      <ViewToggle view={view} onViewChange={setView} />

      {view === 'card' ? (
        <>
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
            {(player) => (
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
        </>
      ) : (
        <PlayerListView
          selectedPlayers={sortedSelectedPlayers}
          reservePlayers={sortedReservePlayers}
          droppedOutPlayers={droppedOutPlayers}
          currentUserId={player?.id}
          showSelected={showSelected}
          showReserves={showReserves}
          showDroppedOut={showDroppedOut}
          setShowSelected={setShowSelected}
          setShowReserves={setShowReserves}
          setShowDroppedOut={setShowDroppedOut}
        >
          {(player) => (
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
        </PlayerListView>
      )}
    </div>
  );
};