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
import { getRarity } from '../../utils/rarityCalculations';

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

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        
        // Get player stats for all players
        const playerIds = [...selectedPlayers, ...reservePlayers, ...droppedOutPlayers].map(player => player.id);
        
        // Get win rates
        const { data: winRatesData, error: winRatesError } = await supabase
          .rpc('get_player_win_rates');

        if (winRatesError) throw winRatesError;

        // Get other player stats
        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select(`
            id,
            xp,
            caps,
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak
          `)
          .in('id', playerIds);

        // Get player XP data for rarity
        const { data: xpData, error: xpError } = await supabase
          .from('player_xp')
          .select('player_id, rarity')
          .in('player_id', playerIds);

        if (statsError) throw statsError;
        if (xpError) throw xpError;

        // Create win rates map
        const winRatesMap = new Map(winRatesData?.map(wr => [wr.id, {
          wins: wr.wins,
          draws: wr.draws,
          losses: wr.losses,
          total_games: wr.total_games,
          win_rate: wr.win_rate
        }]) || []);

        // Combine rarity data with stats
        const rarityMap = xpData?.reduce((acc, xp) => ({
          ...acc,
          [xp.player_id]: xp.rarity
        }), {});

        // Transform into record for easy lookup
        const stats = statsData?.reduce((acc, stat) => {
          const winRate = winRatesMap.get(stat.id);
          return {
            ...acc,
            [stat.id]: {
              xp: stat.xp || 0,
              rarity: rarityMap?.[stat.id] || 'Amateur',
              caps: stat.caps || 0,
              activeBonuses: stat.active_bonuses || 0,
              activePenalties: stat.active_penalties || 0,
              currentStreak: stat.current_streak || 0,
              maxStreak: stat.max_streak || 0,
              wins: winRate?.wins || 0,
              draws: winRate?.draws || 0,
              losses: winRate?.losses || 0,
              totalGames: winRate?.total_games || 0,
              winRate: winRate?.win_rate || 0
            }
          };
        }, {});

        setPlayerStats(stats || {});
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

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

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
              friendlyName: player.friendly_name,
              xp: playerStats[player.id]?.xp || 0,
              rarity: playerStats[player.id]?.rarity || 'Amateur',
              caps: playerStats[player.id]?.caps || 0,
              activeBonuses: playerStats[player.id]?.activeBonuses || 0,
              activePenalties: playerStats[player.id]?.activePenalties || 0,
              currentStreak: playerStats[player.id]?.currentStreak || 0,
              maxStreak: playerStats[player.id]?.maxStreak || 0,
              wins: playerStats[player.id]?.wins || 0,
              draws: playerStats[player.id]?.draws || 0,
              losses: playerStats[player.id]?.losses || 0,
              totalGames: playerStats[player.id]?.totalGames || 0,
              winRate: playerStats[player.id]?.winRate || 0,
              hasActiveSlotOffers: activeSlotOffers?.length > 0
            }))}
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
              friendlyName: player.friendly_name,
              xp: playerStats[player.id]?.xp || 0,
              rarity: playerStats[player.id]?.rarity || 'Amateur',
              caps: playerStats[player.id]?.caps || 0,
              activeBonuses: playerStats[player.id]?.activeBonuses || 0,
              activePenalties: playerStats[player.id]?.activePenalties || 0,
              currentStreak: playerStats[player.id]?.currentStreak || 0,
              maxStreak: playerStats[player.id]?.maxStreak || 0,
              wins: playerStats[player.id]?.wins || 0,
              draws: playerStats[player.id]?.draws || 0,
              losses: playerStats[player.id]?.losses || 0,
              totalGames: playerStats[player.id]?.totalGames || 0,
              winRate: playerStats[player.id]?.winRate || 0,
              potentialOfferTimes: player.potentialOfferTimes,
              slotOfferAvailableAt: player.slotOffers?.[0]?.available_at || player.potentialOfferTimes?.available_time,
              slotOfferExpiresAt: player.slotOffers?.[0]?.expires_at || player.potentialOfferTimes?.next_player_access_time,
              hasSlotOffer: player.slotOffers?.length > 0,
              declinedAt: player.slotOffers?.[0]?.declined_at || null,
              hasActiveSlotOffers: activeSlotOffers?.length > 0
            }))}
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
              friendlyName: player.friendly_name,
              xp: playerStats[player.id]?.xp || 0,
              rarity: playerStats[player.id]?.rarity || 'Amateur',
              caps: playerStats[player.id]?.caps || 0,
              activeBonuses: playerStats[player.id]?.activeBonuses || 0,
              activePenalties: playerStats[player.id]?.activePenalties || 0,
              currentStreak: playerStats[player.id]?.currentStreak || 0,
              maxStreak: playerStats[player.id]?.maxStreak || 0,
              wins: playerStats[player.id]?.wins || 0,
              draws: playerStats[player.id]?.draws || 0,
              losses: playerStats[player.id]?.losses || 0,
              totalGames: playerStats[player.id]?.totalGames || 0,
              winRate: playerStats[player.id]?.winRate || 0,
              hasActiveSlotOffers: activeSlotOffers?.length > 0
            }))}
            isExpanded={showDroppedOut}
            onToggle={() => setShowDroppedOut(!showDroppedOut)}
          />
        </>
      ) : (
        <PlayerListView
          selectedPlayers={selectedPlayers.map(player => ({
            ...player,
            friendlyName: player.friendly_name,
            xp: playerStats[player.id]?.xp || 0,
            rarity: playerStats[player.id]?.rarity || 'Amateur',
            caps: playerStats[player.id]?.caps || 0,
            activeBonuses: playerStats[player.id]?.activeBonuses || 0,
            activePenalties: playerStats[player.id]?.activePenalties || 0,
            currentStreak: playerStats[player.id]?.currentStreak || 0,
            maxStreak: playerStats[player.id]?.maxStreak || 0,
            wins: playerStats[player.id]?.wins || 0,
            draws: playerStats[player.id]?.draws || 0,
            losses: playerStats[player.id]?.losses || 0,
            totalGames: playerStats[player.id]?.totalGames || 0,
            winRate: playerStats[player.id]?.winRate || 0
          }))}
          reservePlayers={reservePlayers.map(player => ({
            ...player,
            friendlyName: player.friendly_name,
            xp: playerStats[player.id]?.xp || 0,
            rarity: playerStats[player.id]?.rarity || 'Amateur',
            caps: playerStats[player.id]?.caps || 0,
            activeBonuses: playerStats[player.id]?.activeBonuses || 0,
            activePenalties: playerStats[player.id]?.activePenalties || 0,
            currentStreak: playerStats[player.id]?.currentStreak || 0,
            maxStreak: playerStats[player.id]?.maxStreak || 0,
            wins: playerStats[player.id]?.wins || 0,
            draws: playerStats[player.id]?.draws || 0,
            losses: playerStats[player.id]?.losses || 0,
            totalGames: playerStats[player.id]?.totalGames || 0,
            winRate: playerStats[player.id]?.winRate || 0
          }))}
          droppedOutPlayers={droppedOutPlayers.map(player => ({
            ...player,
            friendlyName: player.friendly_name,
            xp: playerStats[player.id]?.xp || 0,
            rarity: playerStats[player.id]?.rarity || 'Amateur',
            caps: playerStats[player.id]?.caps || 0,
            activeBonuses: playerStats[player.id]?.activeBonuses || 0,
            activePenalties: playerStats[player.id]?.activePenalties || 0,
            currentStreak: playerStats[player.id]?.currentStreak || 0,
            maxStreak: playerStats[player.id]?.maxStreak || 0,
            wins: playerStats[player.id]?.wins || 0,
            draws: playerStats[player.id]?.draws || 0,
            losses: playerStats[player.id]?.losses || 0,
            totalGames: playerStats[player.id]?.totalGames || 0,
            winRate: playerStats[player.id]?.winRate || 0
          }))}
          playerStats={playerStats}
        />
      )}
    </div>
  );
};