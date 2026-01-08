import React, { useState, useEffect, memo } from 'react';
import { FaUser, FaUserClock } from 'react-icons/fa';
import { MdPauseCircle } from 'react-icons/md';
import { useUser } from '../../hooks/useUser';
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
import { PlayerCard } from '../player-card/PlayerCard';
import { WeightedSelectionExplanation } from './WeightedSelectionExplanation';
import { findClosestPlaystyle } from '../../utils/playstyleUtils';
import { PREDEFINED_PLAYSTYLES } from '../../data/playstyles';
import { DropoutConfirmModal } from '../game/DropoutConfirmModal';

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
    const tokenPlayers = selectedPlayers.filter(p => p.using_token);
    const forgivenTokenPlayers = selectedPlayers.filter(p => p.selection_method === 'merit' && p.using_token === false && p.had_token === true);
    const meritPlayers = selectedPlayers.filter(p => p.selection_method === 'merit' && !p.using_token && !p.had_token);
    const randomPlayers = selectedPlayers.filter(p => p.selection_method === 'random');
    const whatsappReserves = reservePlayers.filter(p => 
      p.whatsapp_group_member === 'Yes' || p.whatsapp_group_member === 'Proxy'
    );
    const nonWhatsappReserves = reservePlayers.filter(p => 
      p.whatsapp_group_member === 'No' || !p.whatsapp_group_member
    );

    // Get the random pool (players not selected by merit or token)
    const randomPool = [...reservePlayers, ...randomPlayers].filter(
      player => !meritPlayers.some(mp => mp.id === player.id) && !tokenPlayers.some(tp => tp.id === player.id)
    );

    // Prepare data for weighted selection explanation
    const eligiblePlayers = randomPool.map(player => ({
      id: player.id,
      friendly_name: player.friendly_name,
      benchWarmerStreak: playerStats[player.id]?.benchWarmerStreak || 0,
      whatsapp_group_member: player.whatsapp_group_member,
      total_points: 0,  // Will be calculated by the component
      probability: 0    // Will be calculated by the component
    }));

    return (
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-bold mb-2">Token Selection ({tokenPlayers.length} players)</h4>
          <p className="mb-2">Players using a priority token are guaranteed a slot:</p>
          <ul className="list-disc pl-4">
            {tokenPlayers.map(player => {
              const stats = playerStats[player.id];
              const isWhatsApp = player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy';
              return (
                <li key={player.id} className="mb-2">
                  <span className="font-semibold">{player.friendly_name}</span>: Selected by token
                  {isWhatsApp && ' (WhatsApp member)'}
                </li>
              );
            })}
          </ul>
        </div>

        {forgivenTokenPlayers.length > 0 && (
          <div>
            <h4 className="font-bold mb-2">Token Forgiveness ({forgivenTokenPlayers.length} players)</h4>
            <p className="mb-2">These players used their token but would have been selected by merit anyway, so their tokens were returned:</p>
            <ul className="list-disc pl-4">
              {forgivenTokenPlayers.map(player => {
                const stats = playerStats[player.id];
                const isWhatsApp = player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy';
                return (
                  <li key={player.id} className="mb-2">
                    <span className="font-semibold">{player.friendly_name}</span>: Token returned
                    {' '}(Selected by merit with {stats?.xp || 0} XP)
                    {isWhatsApp && ' (WhatsApp member)'}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <h4 className="font-bold mb-2">Merit Selection ({meritPlayers.length} players)</h4>
          <p className="mb-2">After token slots were allocated, remaining slots were filled by XP (highest first). Players who used a token in the previous game (<MdPauseCircle size={14} className="text-warning inline" /> token cooldown) were moved to the bottom of the list. For players with the same token cooldown status, the following criteria were used in order:</p>
          <ol className="list-decimal pl-4 mb-4">
            <li><strong>Payment status:</strong> Players with unpaid games are moved to the bottom to disincentivise missing payments</li>
            <li><strong>Token cooldown (<MdPauseCircle size={14} className="text-warning inline" />):</strong> Players who used a token in the previous game are deprioritized (moved to bottom of list)</li>
            <li>WhatsApp membership (members won)</li>
            <li>Current streak (highest won)</li>
            <li>Caps (highest won)</li>
            <li>Registration time (earliest won)</li>
          </ol>
          <ul className="list-disc pl-4">
            {meritPlayers.map(player => {
              const stats = playerStats[player.id];
              const isWhatsApp = player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy';
              const usedTokenLastGame = player.used_token_last_game;
              const hasUnpaidGames = (stats?.unpaidGames || 0) > 0;
              return (
                <li key={player.id} className="mb-2">
                  <span className="font-semibold">{player.friendly_name}</span>: Selected by merit with
                  {' '}{stats?.xp || 0} XP
                  {isWhatsApp && ' (WhatsApp member)'}
                  {hasUnpaidGames && (
                    <span className="text-error"> ({stats?.unpaidGames || 0} unpaid game{(stats?.unpaidGames || 0) !== 1 ? 's' : ''})</span>
                  )}
                  {usedTokenLastGame && (
                    <span className="text-secondary"> (<MdPauseCircle size={14} className="text-warning inline" /> Token cooldown - used token last game)</span>
                  )}
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
          <p className="mb-2">After token and merit slots were filled, 2 slots were reserved for random selection with the following priority order:</p>
          <ol className="list-decimal pl-4 mb-4">
            <li><strong>WhatsApp members with no unpaid games</strong> (highest priority)</li>
            <li><strong>Non-WhatsApp members with no unpaid games</strong></li>
            <li><strong>WhatsApp members with unpaid games</strong></li>
            <li><strong>Non-WhatsApp members with unpaid games</strong> (lowest priority)</li>
          </ol>
          <p className="mb-2">Within each group, selection is weighted by bench warmer streak (consecutive reserve appearances).</p>
          
          {/* Add weighted selection explanation */}
          <WeightedSelectionExplanation 
            players={eligiblePlayers}
            numSlots={randomPlayers.length}
          />

          {/* Show selected players */}
          <div className="mt-4">
            <p className="font-semibold mb-2">Selected Players:</p>
            <ul className="list-disc pl-4">
              {randomPlayers.map(player => {
                const stats = playerStats[player.id];
                const isWhatsApp = player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy';
                const hasUnpaidGames = (stats?.unpaidGames || 0) > 0;
                return (
                  <li key={player.id} className="mb-2">
                    <span className="font-semibold">{player.friendly_name}</span>
                    {isWhatsApp && ' (WhatsApp member)'}
                    {hasUnpaidGames && (
                      <span className="text-error"> ({stats?.unpaidGames || 0} unpaid game{(stats?.unpaidGames || 0) !== 1 ? 's' : ''})</span>
                    )}
                    <span className="text-info">
                      {' '}(Reserve streak: {stats?.benchWarmerStreak || 0} games)
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
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
  const [error, setError] = React.useState<string | null>(null);
  const [showDropoutModal, setShowDropoutModal] = useState(false);

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
        
        // Get player stats and XP data
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select(`
            id,
            caps,
            current_streak,
            max_streak,
            bench_warmer_streak,
            active_bonuses,
            active_penalties,
            win_rate,
            unpaid_games,
            unpaid_games_modifier,
            shield_active,
            protected_streak_value,
            shield_tokens_available,
            player_xp (
              xp,
              rank,
              rarity
            )
          `)
          .in('id', playerIds);

        if (playerError) throw playerError;

        // Get registration streak data
        const { data: regStreakData, error: regStreakError } = await supabase
          .from('player_current_registration_streak_bonus')
          .select('friendly_name, current_streak_length, bonus_applies');

        if (regStreakError) throw regStreakError;

        // Get player averaged attributes for playstyle matching
        const { data: derivedAttrsData, error: derivedAttrsError } = await supabase
          .from('player_derived_attributes')
          .select(`
            player_id,
            pace_rating,
            shooting_rating,
            passing_rating,
            dribbling_rating,
            defending_rating,
            physical_rating,
            total_ratings_count
          `)
          .in('player_id', playerIds);

        if (derivedAttrsError) throw derivedAttrsError;

        // Create a map of registration streak data for easy lookup
        const regStreakMap = regStreakData?.reduce((acc: any, player: any) => ({
          ...acc,
          [player.friendly_name]: {
            registrationStreak: player.current_streak_length || 0,
            registrationStreakApplies: player.bonus_applies || false
          }
        }), {});

        // Create a map of derived attributes for easy lookup
        const derivedAttrsMap = derivedAttrsData?.reduce((acc: any, player: any) => ({
          ...acc,
          [player.player_id]: {
            pace_rating: player.pace_rating,
            shooting_rating: player.shooting_rating,
            passing_rating: player.passing_rating,
            dribbling_rating: player.dribbling_rating,
            defending_rating: player.defending_rating,
            physical_rating: player.physical_rating,
            total_ratings_count: player.total_ratings_count
          }
        }), {});

        // Get win rates and game stats
        const { data: winRateData, error: winRateError } = await supabase
          .rpc('get_player_win_rates')
          .in('id', playerIds);

        if (winRateError) throw winRateError;

        // Create a map of win rate data for easy lookup
        const winRateMap = winRateData.reduce((acc: any, player: any) => ({
          ...acc,
          [player.id]: {
            wins: player.wins,
            draws: player.draws,
            losses: player.losses,
            totalGames: player.total_games,
            winRate: player.win_rate
          }
        }), {});

        // Get last 40 completed historical games for recent games calculation
        const { data: latestGameData, error: gameError } = await supabase
          .from('games')
          .select('id, sequence_number')
          .eq('completed', true)
          .eq('is_historical', true)
          .order('sequence_number', { ascending: false })
          .limit(40);

        if (gameError) throw gameError;

        const last40GameIds = latestGameData?.map(g => g.id) || [];

        // Fetch registrations ONLY for those 40 games to avoid query limits
        const { data: gameRegistrationsData, error: regError } = await supabase
          .from('game_registrations')
          .select('player_id, game_id, status')
          .in('game_id', last40GameIds);

        if (regError) throw regError;

        // Build participation arrays for each player
        // Note: Index 0 = oldest game (40 games ago), Index 39 = most recent game
        const participationMap: Record<string, Array<'selected' | 'reserve' | null>> = {};

        playerIds.forEach(playerId => {
          const participation = new Array(40).fill(null);

          latestGameData?.forEach((game, index) => {
            const registration = gameRegistrationsData?.find(
              r => r.player_id === playerId && r.game_id === game.id
            );

            if (registration) {
              // Reverse the index so 0 is the oldest game and 39 is the most recent
              participation[39 - index] = registration.status === 'selected' ? 'selected' : 'reserve';
            }
          });

          participationMap[playerId] = participation;
        });

        // Count recent games (selected status only) per player
        const recentGamesMap = gameRegistrationsData?.reduce((acc, reg) => {
          if (reg.status === 'selected') {
            acc[reg.player_id] = (acc[reg.player_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        // Transform into record for easy lookup
        const stats = playerData?.reduce((acc, player) => {
          // Calculate closest playstyle match
          const playerAttributes = derivedAttrsMap[player.id];
          const playstyleMatch = playerAttributes ?
            findClosestPlaystyle(playerAttributes, PREDEFINED_PLAYSTYLES) : null;

          return {
            ...acc,
            [player.id]: {
              xp: player.player_xp?.xp || 0,
              rarity: player.player_xp?.rarity || 'Amateur',
              caps: player.caps || 0,
              activeBonuses: player.active_bonuses || 0,
              activePenalties: player.active_penalties || 0,
              currentStreak: player.current_streak || 0,
              maxStreak: player.max_streak || 0,
              benchWarmerStreak: player.bench_warmer_streak || 0,
              wins: winRateMap[player.id]?.wins || 0,
              draws: winRateMap[player.id]?.draws || 0,
              losses: winRateMap[player.id]?.losses || 0,
              totalGames: winRateMap[player.id]?.totalGames || 0,
              winRate: winRateMap[player.id]?.winRate || 0,
              rank: player.player_xp?.rank || undefined,
              unpaidGames: player.unpaid_games || 0,
              unpaidGamesModifier: player.unpaid_games_modifier || 0,
              registrationStreakBonus: regStreakMap[selectedPlayers.find(p => p.id === player.id)?.friendly_name || reservePlayers.find(p => p.id === player.id)?.friendly_name || droppedOutPlayers.find(p => p.id === player.id)?.friendly_name]?.registrationStreak || 0,
              registrationStreakBonusApplies: regStreakMap[selectedPlayers.find(p => p.id === player.id)?.friendly_name || reservePlayers.find(p => p.id === player.id)?.friendly_name || droppedOutPlayers.find(p => p.id === player.id)?.friendly_name]?.registrationStreakApplies || false,
              averagedPlaystyle: playstyleMatch?.playstyleName,
              playstyleMatchDistance: playstyleMatch?.matchDistance,
              playstyleCategory: playstyleMatch?.category,
              playstyleRatingsCount: derivedAttrsMap[player.id]?.total_ratings_count || 0,
              recentGames: recentGamesMap?.[player.id] || 0,
              gameParticipation: participationMap[player.id] || new Array(40).fill(null),
              shieldActive: player.shield_active || false,
              protectedStreakValue: player.protected_streak_value || null,
              shieldTokensAvailable: player.shield_tokens_available || 0
            }
          };
        }, {});

        setPlayerStats(stats);
      } catch (err) {
        setError('Failed to fetch player stats');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, [selectedPlayers, reservePlayers, droppedOutPlayers]);

  const allPlayers = [...selectedPlayers, ...reservePlayers, ...droppedOutPlayers];
  
  const getPlayerWithRank = (player) => {
    return {
      ...player,
      rank: playerStats[player.id]?.rank,
      averagedPlaystyle: playerStats[player.id]?.averagedPlaystyle,
      playstyleMatchDistance: playerStats[player.id]?.playstyleMatchDistance,
      playstyleCategory: playerStats[player.id]?.playstyleCategory
    };
  };

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

  const handleDropout = () => {
    if (!player?.id || !gameId) {
      toast.error('Unable to drop out: Missing player or game information');
      return;
    }
    setShowDropoutModal(true);
  };

  const handleDropoutComplete = async () => {
    await refreshPlayers();
    setShowDropoutModal(false);
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
            players={selectedPlayers
              .sort((a, b) => {
                // First sort by token usage
                if (a.using_token !== b.using_token) {
                  return a.using_token ? -1 : 1;
                }
                // Then by XP within each group (token users and non-token users)
                return (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0);
              })
              .map(player => ({
                ...getPlayerWithRank(player),
                friendlyName: player.friendly_name,
                avatarSvg: player.avatar_svg,
                xp: playerStats[player.id]?.xp || 0,
                rarity: playerStats[player.id]?.rarity || 'Amateur',
                caps: playerStats[player.id]?.caps || 0,
                activeBonuses: playerStats[player.id]?.activeBonuses || 0,
                activePenalties: playerStats[player.id]?.activePenalties || 0,
                currentStreak: playerStats[player.id]?.currentStreak || 0,
                maxStreak: playerStats[player.id]?.maxStreak || 0,
                benchWarmerStreak: playerStats[player.id]?.benchWarmerStreak || 0,
                wins: playerStats[player.id]?.wins || 0,
                draws: playerStats[player.id]?.draws || 0,
                losses: playerStats[player.id]?.losses || 0,
                totalGames: playerStats[player.id]?.totalGames || 0,
                winRate: playerStats[player.id]?.winRate || 0,
                whatsapp_group_member: player.whatsapp_group_member,
                hasActiveSlotOffers: activeSlotOffers?.length > 0,
                isRandomlySelected: player.selection_method === 'random',
                unpaidGames: playerStats[player.id]?.unpaidGames || 0,
                unpaidGamesModifier: playerStats[player.id]?.unpaidGamesModifier || 0,
                registrationStreakBonus: playerStats[player.id]?.registrationStreakBonus || 0,
                registrationStreakBonusApplies: playerStats[player.id]?.registrationStreakBonusApplies || false,
                usingToken: player.using_token,
                playstyleRatingsCount: playerStats[player.id]?.playstyleRatingsCount || 0,
                recentGames: playerStats[player.id]?.recentGames || 0,
                gameParticipation: playerStats[player.id]?.gameParticipation || new Array(40).fill(null)
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

                // Both have same WhatsApp status - check unpaid games (no unpaid games first)
                const aHasUnpaid = (playerStats[a.id]?.unpaidGames || 0) > 0 ? 1 : 0;
                const bHasUnpaid = (playerStats[b.id]?.unpaidGames || 0) > 0 ? 1 : 0;
                if (aHasUnpaid !== bHasUnpaid) {
                  return aHasUnpaid - bHasUnpaid;
                }

                // Both have same payment status - compare by XP
                if ((playerStats[b.id]?.xp || 0) !== (playerStats[a.id]?.xp || 0)) {
                  return (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0);
                }

                // Both have same XP and payment status - check streak
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
                ...getPlayerWithRank(player),
                friendlyName: player.friendly_name,
                avatarSvg: player.avatar_svg,
                xp: playerStats[player.id]?.xp || 0,
                rarity: playerStats[player.id]?.rarity || 'Amateur',
                caps: playerStats[player.id]?.caps || 0,
                activeBonuses: playerStats[player.id]?.activeBonuses || 0,
                activePenalties: playerStats[player.id]?.activePenalties || 0,
                currentStreak: playerStats[player.id]?.currentStreak || 0,
                maxStreak: playerStats[player.id]?.maxStreak || 0,
                benchWarmerStreak: playerStats[player.id]?.benchWarmerStreak || 0,
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
                hasActiveSlotOffers: activeSlotOffers?.length > 0,
                unpaidGames: playerStats[player.id]?.unpaidGames || 0,
                unpaidGamesModifier: playerStats[player.id]?.unpaidGamesModifier || 0,
                registrationStreakBonus: playerStats[player.id]?.registrationStreakBonus || 0,
                registrationStreakBonusApplies: playerStats[player.id]?.registrationStreakBonusApplies || false,
                usingToken: player.using_token,
                playstyleRatingsCount: playerStats[player.id]?.playstyleRatingsCount || 0,
                recentGames: playerStats[player.id]?.recentGames || 0,
                gameParticipation: playerStats[player.id]?.gameParticipation || new Array(40).fill(null)
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
              ...getPlayerWithRank(player),
              friendlyName: player.friendly_name,
              avatarSvg: player.avatar_svg,
              xp: playerStats[player.id]?.xp || 0,
              rarity: playerStats[player.id]?.rarity || 'Amateur',
              caps: playerStats[player.id]?.caps || 0,
              activeBonuses: playerStats[player.id]?.activeBonuses || 0,
              activePenalties: playerStats[player.id]?.activePenalties || 0,
              currentStreak: playerStats[player.id]?.currentStreak || 0,
              maxStreak: playerStats[player.id]?.maxStreak || 0,
              benchWarmerStreak: playerStats[player.id]?.benchWarmerStreak || 0,
              wins: playerStats[player.id]?.wins || 0,
              draws: playerStats[player.id]?.draws || 0,
              losses: playerStats[player.id]?.losses || 0,
              totalGames: playerStats[player.id]?.totalGames || 0,
              winRate: playerStats[player.id]?.winRate || 0,
              hasActiveSlotOffers: activeSlotOffers?.length > 0,
              unpaidGames: playerStats[player.id]?.unpaidGames || 0,
              unpaidGamesModifier: playerStats[player.id]?.unpaidGamesModifier || 0,
              registrationStreakBonus: playerStats[player.id]?.registrationStreakBonus || 0,
              registrationStreakBonusApplies: playerStats[player.id]?.registrationStreakBonusApplies || false,
              usingToken: player.using_token,
              playstyleRatingsCount: playerStats[player.id]?.playstyleRatingsCount || 0,
              recentGames: playerStats[player.id]?.recentGames || 0,
              gameParticipation: playerStats[player.id]?.gameParticipation || new Array(40).fill(null),
              shieldActive: playerStats[player.id]?.shieldActive || false,
              frozenStreakValue: playerStats[player.id]?.protectedStreakValue || null
            }))}
            isExpanded={showDroppedOut}
            onToggle={() => setShowDroppedOut(!showDroppedOut)}
          />
        </>
      ) : (
        <PlayerListView
          selectedPlayers={selectedPlayers.map(player => ({
            ...getPlayerWithRank(player),
            friendlyName: player.friendly_name,
            avatarSvg: player.avatar_svg,
            xp: playerStats[player.id]?.xp || 0,
            rarity: playerStats[player.id]?.rarity || 'Amateur',
            caps: playerStats[player.id]?.caps || 0,
            activeBonuses: playerStats[player.id]?.activeBonuses || 0,
            activePenalties: playerStats[player.id]?.activePenalties || 0,
            currentStreak: playerStats[player.id]?.currentStreak || 0,
            maxStreak: playerStats[player.id]?.maxStreak || 0,
            benchWarmerStreak: playerStats[player.id]?.benchWarmerStreak || 0,
            wins: playerStats[player.id]?.wins || 0,
            draws: playerStats[player.id]?.draws || 0,
            losses: playerStats[player.id]?.losses || 0,
            totalGames: playerStats[player.id]?.totalGames || 0,
            winRate: playerStats[player.id]?.winRate || 0,
            unpaidGames: playerStats[player.id]?.unpaidGames || 0,
            unpaidGamesModifier: playerStats[player.id]?.unpaidGamesModifier || 0,
            registrationStreakBonus: playerStats[player.id]?.registrationStreakBonus || 0,
            registrationStreakBonusApplies: playerStats[player.id]?.registrationStreakBonusApplies || false
          }))}
          reservePlayers={[...reservePlayers]
            .sort((a, b) => {
              // First check WhatsApp status
              const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
              const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
              
              if (aIsWhatsApp !== bIsWhatsApp) {
                return aIsWhatsApp ? -1 : 1;
              }

              // Both have same WhatsApp status - check unpaid games (no unpaid games first)
              const aHasUnpaid = (playerStats[a.id]?.unpaidGames || 0) > 0 ? 1 : 0;
              const bHasUnpaid = (playerStats[b.id]?.unpaidGames || 0) > 0 ? 1 : 0;
              if (aHasUnpaid !== bHasUnpaid) {
                return aHasUnpaid - bHasUnpaid;
              }

              // Both have same payment status - compare by XP
              if ((playerStats[b.id]?.xp || 0) !== (playerStats[a.id]?.xp || 0)) {
                return (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0);
              }

              // Both have same XP and payment status - check streak
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
              ...getPlayerWithRank(player),
              friendlyName: player.friendly_name,
              avatarSvg: player.avatar_svg,
              xp: playerStats[player.id]?.xp || 0,
              rarity: playerStats[player.id]?.rarity || 'Amateur',
              caps: playerStats[player.id]?.caps || 0,
              activeBonuses: playerStats[player.id]?.activeBonuses || 0,
              activePenalties: playerStats[player.id]?.activePenalties || 0,
              currentStreak: playerStats[player.id]?.currentStreak || 0,
              maxStreak: playerStats[player.id]?.maxStreak || 0,
              benchWarmerStreak: playerStats[player.id]?.benchWarmerStreak || 0,
              wins: playerStats[player.id]?.wins || 0,
              draws: playerStats[player.id]?.draws || 0,
              losses: playerStats[player.id]?.losses || 0,
              totalGames: playerStats[player.id]?.totalGames || 0,
              winRate: playerStats[player.id]?.winRate || 0,
              unpaidGames: playerStats[player.id]?.unpaidGames || 0,
              unpaidGamesModifier: playerStats[player.id]?.unpaidGamesModifier || 0,
              registrationStreakBonus: playerStats[player.id]?.registrationStreakBonus || 0,
              registrationStreakBonusApplies: playerStats[player.id]?.registrationStreakBonusApplies || false
            }))}
          droppedOutPlayers={droppedOutPlayers.map(player => ({
            ...getPlayerWithRank(player),
            friendlyName: player.friendly_name,
            avatarSvg: player.avatar_svg,
            xp: playerStats[player.id]?.xp || 0,
            rarity: playerStats[player.id]?.rarity || 'Amateur',
            caps: playerStats[player.id]?.caps || 0,
            activeBonuses: playerStats[player.id]?.activeBonuses || 0,
            activePenalties: playerStats[player.id]?.activePenalties || 0,
            currentStreak: playerStats[player.id]?.currentStreak || 0,
            maxStreak: playerStats[player.id]?.maxStreak || 0,
            benchWarmerStreak: playerStats[player.id]?.benchWarmerStreak || 0,
            wins: playerStats[player.id]?.wins || 0,
            draws: playerStats[player.id]?.draws || 0,
            losses: playerStats[player.id]?.losses || 0,
            totalGames: playerStats[player.id]?.totalGames || 0,
            winRate: playerStats[player.id]?.winRate || 0,
            unpaidGames: playerStats[player.id]?.unpaidGames || 0,
            unpaidGamesModifier: playerStats[player.id]?.unpaidGamesModifier || 0,
            registrationStreakBonus: playerStats[player.id]?.registrationStreakBonus || 0,
            registrationStreakBonusApplies: playerStats[player.id]?.registrationStreakBonusApplies || false,
            usingToken: player.using_token,
            shieldActive: playerStats[player.id]?.shieldActive || false,
            frozenStreakValue: playerStats[player.id]?.protectedStreakValue || null
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

      {/* Dropout Confirmation Modal */}
      {player?.id && (
        <DropoutConfirmModal
          isOpen={showDropoutModal}
          onClose={() => setShowDropoutModal(false)}
          playerId={player.id}
          playerName={player.friendly_name || 'Player'}
          gameId={gameId}
          currentStreak={playerStats[player.id]?.currentStreak || 0}
          shieldTokensAvailable={playerStats[player.id]?.shieldTokensAvailable || 0}
          onDropoutComplete={handleDropoutComplete}
        />
      )}
    </div>
  );
};