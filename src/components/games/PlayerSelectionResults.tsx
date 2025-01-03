import React, { useState, useEffect } from 'react';
import { FaUser, FaUserClock } from 'react-icons/fa';
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
import { useGlobalXP } from '../../hooks/useGlobalXP';
import { calculateRarity } from '../../utils/rarityCalculations';

/**
 * Main component for displaying player selection results
 * Shows selected players, reserve players, and dropped out players
 */
export const PlayerSelectionResults: React.FC<PlayerSelectionResultsProps> = ({ gameId }) => {
  const [showSelected, setShowSelected] = useState(true);
  const [showReserves, setShowReserves] = useState(false);
  const [showDroppedOut, setShowDroppedOut] = useState(false);
  const [view, setView] = useState<'list' | 'card'>('card');
  const [playerStats, setPlayerStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);

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

  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();

  // Fetch player stats for XP calculation
  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        
        // Get player stats for all players
        const playerIds = [...selectedPlayers, ...reservePlayers, ...droppedOutPlayers].map(player => player.id);
        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select(`
            id,
            xp,
            caps,
            active_bonuses,
            active_penalties,
            win_rate,
            current_streak,
            max_streak
          `)
          .in('id', playerIds);

        if (statsError) throw statsError;

        // Transform into a lookup object
        const statsLookup = statsData.reduce((acc, player) => {
          acc[player.id] = {
            xp: player.xp || 0,
            caps: player.caps || 0,
            active_bonuses: player.active_bonuses || 0,
            active_penalties: player.active_penalties || 0,
            win_rate: player.win_rate || 0,
            current_streak: player.current_streak || 0,
            max_streak: player.max_streak || 0
          };
          return acc;
        }, {} as Record<string, any>);

        setPlayerStats(statsLookup);
      } catch (error) {
        console.error('Error fetching player stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedPlayers.length > 0 || reservePlayers.length > 0 || droppedOutPlayers.length > 0) {
      fetchPlayerStats();
    }
  }, [selectedPlayers, reservePlayers, droppedOutPlayers]);

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
      toast.error('Failed to process registration');
    }
  };

  const handleDropout = async () => {
    try {
      if (!player?.id || !gameId) {
        toast.error('Unable to drop out: Missing player or game information');
        return;
      }
      
      const result = await handlePlayerSelfDropout(player.id, gameId);
      if (result.success) {
        await refreshPlayers();
      } else {
        toast.error(result.error || 'Failed to drop out');
      }
    } catch (error) {
      console.error('Error in handleDropout:', error);
      toast.error('Failed to drop out');
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
        className: `btn w-48 ${hasDroppedOut ? 'btn-disabled bg-gray-500 text-white cursor-not-allowed' : 'btn-error'}`,
        text: hasDroppedOut ? 'DROPPED OUT' : 'DROP OUT',
        show: shouldShowButton
      };
    }
  };

  if (isLoading || loading || globalXpLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (globalXpError) {
    return (
      <div className="text-center text-error p-4">
        <p>{globalXpError}</p>
      </div>
    );
  }

  // Get all XP values for rarity calculation
  const allXpValues = Object.values(playerStats).map(stat => stat.xp);

  return (
    <div className="space-y-8">
      {/* Drop Out Button */}
      {getButtonProps().show && (
        <div className="flex justify-center">
          <button
            onClick={getButtonProps().onClick}
            className={getButtonProps().className}
          >
            {getButtonProps().text}
          </button>
        </div>
      )}

      <ViewToggle view={view} onViewChange={setView} />
      
      {view === 'card' ? (
        <>
          {/* Selected Players Section */}
          <PlayerSelectionSection
            title="Selected Players"
            icon={FaUser}
            players={selectedPlayers.map(player => ({
              ...player,
              xp: playerStats[player.id]?.xp || 0,
              caps: playerStats[player.id]?.caps || 0,
              activeBonuses: playerStats[player.id]?.active_bonuses || 0,
              activePenalties: playerStats[player.id]?.active_penalties || 0,
              winRate: playerStats[player.id]?.win_rate || 0,
              currentStreak: playerStats[player.id]?.current_streak || 0,
              maxStreak: playerStats[player.id]?.max_streak || 0,
              preferredPosition: '',
              rarity: calculateRarity(player.xp || 0, globalXpValues),
              hasActiveSlotOffers: activeSlotOffers?.length > 0
            }))}
            allXpValues={Object.values(playerStats).map(stat => stat.xp)}
            isExpanded={showSelected}
            onToggle={() => setShowSelected(!showSelected)}
          >
            {player => (
              <div className="flex flex-col gap-1">
                <SlotOfferCountdown
                  player={player}
                  reservePlayers={reservePlayers}
                  gameDate={gameDate}
                  firstDropoutTime={firstDropoutTime}
                  hasActiveOffers={activeSlotOffers?.length > 0}
                  selectedPlayersCount={selectedPlayers.length}
                  maxPlayers={gameData?.max_players ?? 0}
                />
              </div>
            )}
          </PlayerSelectionSection>

          {/* Reserve Players Section */}
          <PlayerSelectionSection
            title="Reserve Players"
            icon={FaUserClock}
            players={reservePlayers.map(player => ({
              ...player,
              xp: playerStats[player.id]?.xp || 0,
              caps: playerStats[player.id]?.caps || 0,
              activeBonuses: playerStats[player.id]?.active_bonuses || 0,
              activePenalties: playerStats[player.id]?.active_penalties || 0,
              winRate: playerStats[player.id]?.win_rate || 0,
              currentStreak: playerStats[player.id]?.current_streak || 0,
              maxStreak: playerStats[player.id]?.max_streak || 0,
              preferredPosition: '',
              rarity: calculateRarity(player.xp || 0, globalXpValues),
              potentialOfferTimes: player.potentialOfferTimes,
              slotOfferAvailableAt: player.slotOffers?.[0]?.available_at || player.potentialOfferTimes?.available_time,
              slotOfferExpiresAt: player.slotOffers?.[0]?.expires_at || player.potentialOfferTimes?.next_player_access_time,
              hasSlotOffer: player.hasSlotOffer || (player.potentialOfferTimes !== null),
              slotOfferStatus: player.slotOffers?.[0]?.status || null,
              declinedAt: player.slotOffers?.[0]?.declined_at || null,
              hasActiveSlotOffers: activeSlotOffers?.length > 0
            }))}
            allXpValues={Object.values(playerStats).map(stat => stat.xp)}
            isExpanded={showReserves}
            onToggle={() => setShowReserves(!showReserves)}
          >
            {player => (
              <div className="flex flex-col gap-1">
                <SlotOfferCountdown
                  player={player}
                  reservePlayers={reservePlayers}
                  gameDate={gameDate}
                  firstDropoutTime={firstDropoutTime}
                  hasActiveOffers={activeSlotOffers?.length > 0}
                  selectedPlayersCount={selectedPlayers.length}
                  maxPlayers={gameData?.max_players ?? 0}
                />
              </div>
            )}
          </PlayerSelectionSection>

          {/* Dropped Out Players Section */}
          <PlayerSelectionSection
            title="Dropped Out Players"
            icon={FaUserClock}
            players={droppedOutPlayers.map(player => ({
              ...player,
              xp: playerStats[player.id]?.xp || 0,
              caps: playerStats[player.id]?.caps || 0,
              activeBonuses: playerStats[player.id]?.active_bonuses || 0,
              activePenalties: playerStats[player.id]?.active_penalties || 0,
              winRate: playerStats[player.id]?.win_rate || 0,
              currentStreak: playerStats[player.id]?.current_streak || 0,
              maxStreak: playerStats[player.id]?.max_streak || 0,
              preferredPosition: '',
              rarity: calculateRarity(player.xp || 0, globalXpValues),
              hasActiveSlotOffers: activeSlotOffers?.length > 0
            }))}
            allXpValues={Object.values(playerStats).map(stat => stat.xp)}
            isExpanded={showDroppedOut}
            onToggle={() => setShowDroppedOut(!showDroppedOut)}
          />
        </>
      ) : (
        <PlayerListView
          selectedPlayers={selectedPlayers.map(player => ({
            ...player,
            xp: playerStats[player.id]?.xp || 0,
            caps: playerStats[player.id]?.caps || 0,
            activeBonuses: playerStats[player.id]?.active_bonuses || 0,
            activePenalties: playerStats[player.id]?.active_penalties || 0,
            winRate: playerStats[player.id]?.win_rate || 0,
            currentStreak: playerStats[player.id]?.current_streak || 0,
            maxStreak: playerStats[player.id]?.max_streak || 0,
            preferredPosition: '',
            rarity: calculateRarity(player.xp || 0, globalXpValues)
          }))}
          reservePlayers={reservePlayers.map(player => ({
            ...player,
            xp: playerStats[player.id]?.xp || 0,
            caps: playerStats[player.id]?.caps || 0,
            activeBonuses: playerStats[player.id]?.active_bonuses || 0,
            activePenalties: playerStats[player.id]?.active_penalties || 0,
            winRate: playerStats[player.id]?.win_rate || 0,
            currentStreak: playerStats[player.id]?.current_streak || 0,
            maxStreak: playerStats[player.id]?.max_streak || 0,
            preferredPosition: '',
            rarity: calculateRarity(player.xp || 0, globalXpValues)
          }))}
          droppedOutPlayers={droppedOutPlayers.map(player => ({
            ...player,
            xp: playerStats[player.id]?.xp || 0,
            caps: playerStats[player.id]?.caps || 0,
            activeBonuses: playerStats[player.id]?.active_bonuses || 0,
            activePenalties: playerStats[player.id]?.active_penalties || 0,
            winRate: playerStats[player.id]?.win_rate || 0,
            currentStreak: playerStats[player.id]?.current_streak || 0,
            maxStreak: playerStats[player.id]?.max_streak || 0,
            preferredPosition: '',
            rarity: calculateRarity(player.xp || 0, globalXpValues)
          }))}
          playerStats={playerStats}
        />
      )}
    </div>
  );
};