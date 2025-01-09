import React, { useState, useEffect, memo } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface SelectionReasoningProps {
  selectedPlayers: any[];
  reservePlayers: any[];
  playerStats: Record<string, any>;
  gameData: any;
}

const SelectionReasoning: React.FC<SelectionReasoningProps> = memo(({
  selectedPlayers,
  reservePlayers,
  playerStats,
  gameData
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const generateReasoning = () => {
    const meritPlayers = selectedPlayers.filter(p => p.selection_method === 'merit');
    const randomPlayers = selectedPlayers.filter(p => p.selection_method === 'random');
    const whatsappReserves = reservePlayers.filter(p => 
      p.whatsapp_group_member === 'Yes' || p.whatsapp_group_member === 'Proxy'
    );
    const nonWhatsappReserves = reservePlayers.filter(p => 
      p.whatsapp_group_member === 'No' || !p.whatsapp_group_member
    );

    // Get the random pool (players not selected by merit)
    const randomPool = [...reservePlayers, ...randomPlayers].filter(
      player => !meritPlayers.some(mp => mp.id === player.id)
    );

    return (
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-bold mb-2">Merit Selection ({meritPlayers.length} players)</h4>
          <p className="mb-2">Players are selected by XP (highest first). In case of equal XP, the following tiebreakers are used in order:</p>
          <ol className="list-decimal pl-4 mb-4">
            <li>WhatsApp membership (members win)</li>
            <li>Current streak (highest wins)</li>
            <li>Caps (highest wins)</li>
            <li>Registration time (earliest wins)</li>
          </ol>
          <ul className="list-disc pl-4">
            {meritPlayers.map(player => {
              const stats = playerStats[player.id];
              const isWhatsApp = player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy';
              return (
                <li key={player.id} className="mb-2">
                  <span className="font-semibold">{player.friendly_name}</span>: Selected by merit with 
                  {' '}{stats?.xp || 0} XP
                  {isWhatsApp && ' (WhatsApp member)'}
                  {player.tiebreaker && (
                    <span className="text-info">
                      {' '}(Won tiebreaker: {
                        player.tiebreaker === 'whatsapp' ? 'WhatsApp member priority' :
                        player.tiebreaker === 'streak' ? `Higher streak (${stats?.current_streak})` :
                        player.tiebreaker === 'caps' ? `More caps (${stats?.caps})` :
                        'Earlier registration'
                      })
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-2">Random Selection ({randomPlayers.length} players)</h4>
          <p className="mb-2">WhatsApp members are prioritized in the random selection pool according to these rules:</p>
          <ul className="list-disc pl-4 mb-4">
            <li>If there are enough WhatsApp members for all slots: only WhatsApp members are considered</li>
            <li>If there are fewer WhatsApp members than slots: all WhatsApp members are selected, remaining slots filled from non-WhatsApp members</li>
            <li>If no WhatsApp members: regular random selection from all eligible players</li>
          </ul>
          
          {/* Show the selection pool first */}
          <div className="mb-4">
            <p className="font-semibold mb-2">Random Selection Pool:</p>
            {(() => {
              const whatsappMembers = randomPool.filter(
                p => p.whatsapp_group_member === 'Yes' || p.whatsapp_group_member === 'Proxy'
              ).sort((a, b) => (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0));

              const nonWhatsappMembers = randomPool.filter(
                p => p.whatsapp_group_member === 'No' || !p.whatsapp_group_member
              ).sort((a, b) => (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0));

              const enoughWhatsappMembers = whatsappMembers.length >= randomPlayers.length;
              const noWhatsappMembers = whatsappMembers.length === 0;

              return (
                <>
                  <p className="mb-2">
                    {noWhatsappMembers 
                      ? `Since there were no WhatsApp members in the random pool, all players were eligible for random selection.`
                      : enoughWhatsappMembers 
                        ? `Since there were ${whatsappMembers.length} WhatsApp members available for ${randomPlayers.length} random slots, only WhatsApp members were considered for random selection.`
                        : `There were only ${whatsappMembers.length} WhatsApp members available for ${randomPlayers.length} random slots, so non-WhatsApp members were also considered for the remaining ${randomPlayers.length - whatsappMembers.length} slot(s).`
                    }
                  </p>

                  {whatsappMembers.length > 0 && (
                    <div className="pl-4 mb-3">
                      <p className="font-medium">WhatsApp Members{enoughWhatsappMembers ? ' (Random Selection Pool)' : ' (Automatically Selected)'}:</p>
                      <ul className="list-disc pl-4">
                        {whatsappMembers.map(player => (
                          <li key={player.id}>
                            {player.friendly_name} ({playerStats[player.id]?.xp || 0} XP)
                            {randomPlayers.some(rp => rp.id === player.id) && ' - Selected'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {nonWhatsappMembers.length > 0 && (
                    <div className="pl-4">
                      <p className="font-medium">
                        Non-WhatsApp Members {noWhatsappMembers ? '(All Eligible)' : !enoughWhatsappMembers ? `(Eligible for remaining ${randomPlayers.length - whatsappMembers.length} slot(s))` : '(Not considered for random selection)'}:
                      </p>
                      <ul className="list-disc pl-4">
                        {nonWhatsappMembers.map(player => (
                          <li key={player.id}>
                            {player.friendly_name} ({playerStats[player.id]?.xp || 0} XP)
                            {randomPlayers.some(rp => rp.id === player.id) && ' - Selected'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Show the selected players */}
          <p className="font-semibold mb-2">Selected Players:</p>
          <ul className="list-disc pl-4">
            {randomPlayers.map(player => {
              const isWhatsApp = player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy';
              return (
                <li key={player.id} className="mb-2">
                  <span className="font-semibold">{player.friendly_name}</span>: 
                  Selected randomly {isWhatsApp 
                    ? '(WhatsApp member priority)'
                    : '(from remaining slots after WhatsApp members)'}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-2">Reserve Players ({reservePlayers.length} players)</h4>
          <p className="mb-2">Reserve players are ordered with the following priority:</p>
          <ol className="list-decimal pl-4 mb-4">
            <li><strong>WhatsApp Status:</strong> WhatsApp members first, non-members second</li>
            <li><strong>Within Each Group:</strong> Sorted by XP (highest first)</li>
            <li><strong>Tiebreakers:</strong> Same as merit selection (Streak → Caps → Registration Time)</li>
          </ol>
          <ul className="list-disc pl-4">
            {[...reservePlayers]
              .sort((a, b) => {
                // First check WhatsApp status
                const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
                const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
                
                if (aIsWhatsApp !== bIsWhatsApp) {
                  return aIsWhatsApp ? -1 : 1;
                }

                // Both have same WhatsApp status - compare by XP
                if ((playerStats[b.id]?.xp || 0) !== (playerStats[a.id]?.xp || 0)) {
                  return (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0);
                }

                // Both have same XP and WhatsApp status - check streak
                if ((playerStats[b.id]?.current_streak || 0) !== (playerStats[a.id]?.current_streak || 0)) {
                  return (playerStats[b.id]?.current_streak || 0) - (playerStats[a.id]?.current_streak || 0);
                }

                // Same streak - check caps
                if ((playerStats[b.id]?.caps || 0) !== (playerStats[a.id]?.caps || 0)) {
                  return (playerStats[b.id]?.caps || 0) - (playerStats[a.id]?.caps || 0);
                }

                // Same caps - check registration time
                return (a.registration_time || '').localeCompare(b.registration_time || '');
              })
              .map((player, index, array) => {
                const isWhatsApp = player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy';
                const prevPlayer = array[index - 1];
                const isPrevWhatsApp = prevPlayer && (prevPlayer.whatsapp_group_member === 'Yes' || prevPlayer.whatsapp_group_member === 'Proxy');
                const showDivider = index > 0 && isWhatsApp !== isPrevWhatsApp;

                return (
                  <React.Fragment key={player.id}>
                    {showDivider && <div className="my-2 border-t border-base-300"></div>}
                    <li>
                      {player.friendly_name} ({playerStats[player.id]?.xp || 0} XP
                      {playerStats[player.id]?.current_streak > 0 && `, Streak: ${playerStats[player.id]?.current_streak}`}
                      {playerStats[player.id]?.caps > 0 && `, Caps: ${playerStats[player.id]?.caps}`})
                      {isWhatsApp && ' - WhatsApp member'}
                    </li>
                  </React.Fragment>
                );
              })}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 border rounded-lg p-4 bg-base-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-base-300 rounded-lg transition-colors"
      >
        <span className="font-bold">Selection Process Reasoning</span>
        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {generateReasoning()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

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
              avatarSvg: player.avatar_svg,
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
              whatsapp_group_member: player.whatsapp_group_member,
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
            players={[...reservePlayers]
              .sort((a, b) => {
                // First check WhatsApp status
                const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
                const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
                
                if (aIsWhatsApp !== bIsWhatsApp) {
                  return aIsWhatsApp ? -1 : 1;
                }

                // Both have same WhatsApp status - compare by XP
                if ((playerStats[b.id]?.xp || 0) !== (playerStats[a.id]?.xp || 0)) {
                  return (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0);
                }

                // Both have same XP and WhatsApp status - check streak
                if ((playerStats[b.id]?.current_streak || 0) !== (playerStats[a.id]?.current_streak || 0)) {
                  return (playerStats[b.id]?.current_streak || 0) - (playerStats[a.id]?.current_streak || 0);
                }

                // Same streak - check caps
                if ((playerStats[b.id]?.caps || 0) !== (playerStats[a.id]?.caps || 0)) {
                  return (playerStats[b.id]?.caps || 0) - (playerStats[a.id]?.caps || 0);
                }

                // Same caps - check registration time
                return (a.registration_time || '').localeCompare(b.registration_time || '');
              })
              .map(player => ({
                ...player,
                friendlyName: player.friendly_name,
                avatarSvg: player.avatar_svg,
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
                whatsapp_group_member: player.whatsapp_group_member,
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
              avatarSvg: player.avatar_svg,
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
            avatarSvg: player.avatar_svg,
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
          reservePlayers={[...reservePlayers]
            .sort((a, b) => {
              // First check WhatsApp status
              const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
              const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
              
              if (aIsWhatsApp !== bIsWhatsApp) {
                return aIsWhatsApp ? -1 : 1;
              }

              // Both have same WhatsApp status - compare by XP
              if ((playerStats[b.id]?.xp || 0) !== (playerStats[a.id]?.xp || 0)) {
                return (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0);
              }

              // Both have same XP and WhatsApp status - check streak
              if ((playerStats[b.id]?.current_streak || 0) !== (playerStats[a.id]?.current_streak || 0)) {
                return (playerStats[b.id]?.current_streak || 0) - (playerStats[a.id]?.current_streak || 0);
              }

              // Same streak - check caps
              if ((playerStats[b.id]?.caps || 0) !== (playerStats[a.id]?.caps || 0)) {
                return (playerStats[b.id]?.caps || 0) - (playerStats[a.id]?.caps || 0);
              }

              // Same caps - check registration time
              return (a.registration_time || '').localeCompare(b.registration_time || '');
            })
            .map(player => ({
              ...player,
              friendlyName: player.friendly_name,
              avatarSvg: player.avatar_svg,
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
            avatarSvg: player.avatar_svg,
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
      {!isLoading && (
        <SelectionReasoning
          selectedPlayers={selectedPlayers}
          reservePlayers={reservePlayers}
          playerStats={playerStats}
          gameData={gameData}
        />
      )}
    </div>
  );
};