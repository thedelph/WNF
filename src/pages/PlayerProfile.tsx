import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { PlayerHeader } from '../components/profile/PlayerHeader';
import StatsGrid from '../components/profile/StatsGrid';
import { PlayerRating } from '../components/profile/PlayerRating';
import { FilterHeader } from '../components/profile/GameHistory/FilterHeader';
import { GameHistoryTable } from '../components/profile/GameHistory/GameHistoryTable';
import { RatingModal } from '../components/profile/RatingModal';
import { LoadingState } from '../components/common/LoadingState';
import { useGameHistory } from '../hooks/useGameHistory';
import XPBreakdown from '../components/profile/XPBreakdown';
import { PlayerStats } from '../types/player';
import { GameHistory } from '../types/game';
import clsx from 'clsx';
import { Tooltip } from '../components/ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { fromUrlFriendly } from '../utils/urlHelpers';
import TokenStatus from '../components/profile/TokenStatus';
import { executeWithRetry } from '../utils/network';
import { useTokenStatus } from '../hooks/useTokenStatus';
import WinRateGraph from '../components/profile/WinRateGraph';
import { AttributeCombination } from '../types/playstyle';

// Helper function to format date consistently as "12 Mar 2025"
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * PlayerProfile component displays detailed information about a player
 * including their stats, ratings, and game history.
 */
export default function PlayerProfileNew() {
  const params = useParams<{ id?: string; friendlyName?: string }>();
  const [player, setPlayer] = useState<PlayerStats | null>(null);
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestSequence, setLatestSequence] = useState<number>(0);
  const { user } = useAuth();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratings, setRatings] = useState<{ attack: number; defense: number; gameIq: number }>({
    attack: 0,
    defense: 0,
    gameIq: 0,
  });
  const [selectedAttributes, setSelectedAttributes] = useState<AttributeCombination | null>(null);
  const [availablePlaystyles, setAvailablePlaystyles] = useState<Array<{
    id: string;
    name: string;
    pace_weight: number;
    shooting_weight: number;
    passing_weight: number;
    dribbling_weight: number;
    defending_weight: number;
    physical_weight: number
  }>>([]);

  // Use custom hook for game history management
  const {
    sortConfig,
    filters,
    setFilters,
    handleSort,
    sortAndFilterGames,
    getGameOutcome
  } = useGameHistory();

  const { tokenStatus, loading: tokenLoading } = useTokenStatus(player?.id || '');

  const fetchPlaystyles = async () => {
    try {
      const { data, error } = await supabase
        .from('playstyles')
        .select('id, name, pace_weight, shooting_weight, passing_weight, dribbling_weight, defending_weight, physical_weight');

      if (error) throw error;
      setAvailablePlaystyles(data || []);
    } catch (error: any) {
      console.error('Error fetching playstyles:', error);
    }
  };

  useEffect(() => {
    fetchPlaystyles();
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        
        // Get the latest sequence number from completed games
        const { data: latestSequenceData } = await executeWithRetry(
          () => supabase
            .from('games')
            .select('sequence_number')
            .eq('completed', true)
            .order('sequence_number', { ascending: false })
            .limit(1)
            .single()
        );

        const latestSequence = latestSequenceData?.sequence_number || 0;
        console.log('[PlayerProfile] Latest sequence:', latestSequence);

        // Fetch player data
        const playerQuery = supabase
          .from('players')
          .select(`
            id,
            user_id,
            friendly_name,
            avatar_svg,
            caps,
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak,
            bench_warmer_streak,
            whatsapp_group_member,
            player_xp (
              xp,
              rank,
              rarity
            )
          `);

        let playerData;
        let playerError;
        
        if (params.id) {
          // If we have an ID, get the exact player
          const result = await executeWithRetry(
            () => playerQuery.eq('id', params.id)
          );
          playerData = result.data?.[0] || null;
          playerError = result.error;
        } else if (params.friendlyName) {
          // First try exact match (without wildcard)
          const exactName = fromUrlFriendly(params.friendlyName).replace(/%$/, '');
          const exactResult = await executeWithRetry(
            () => playerQuery.eq('friendly_name', exactName)
          );
          
          if (exactResult.data && exactResult.data.length === 1) {
            // Exact match found
            playerData = exactResult.data[0];
          } else {
            // Try partial match but handle multiple results
            const partialResult = await executeWithRetry(
              () => playerQuery.ilike('friendly_name', fromUrlFriendly(params.friendlyName || ''))
            );
            
            if (partialResult.data && partialResult.data.length > 0) {
              if (partialResult.data.length === 1) {
                // Only one match found
                playerData = partialResult.data[0];
              } else {
                // Multiple matches found - take the first one but show a notification
                playerData = partialResult.data[0];
                console.log(`Found ${partialResult.data.length} players matching this name. Using first match.`);
                toast.info(`Multiple players found with similar names. Showing first match.`);
              }
            }
            playerError = partialResult.error;
          }
        }

        if (playerError) {
          console.error('Error fetching player data:', playerError);
          toast.error('Failed to load player data. Please try again.');
          setLoading(false);
          return;
        }

        if (!playerData) {
          toast.error('Player not found');
          setLoading(false);
          return;
        }

        // Get max streak date from the winning streaks function
        // First get all winning streaks, then filter for our player
        const { data: allStreakData, error: streakError } = await executeWithRetry(
          () => supabase
            .rpc('get_player_winning_streaks', { target_year: null })
        );

        if (streakError) {
          console.error('Error fetching streak data:', streakError);
          // Continue without streak date data
        }

        // Find the streak data for our specific player
        const streakData = allStreakData?.find((player: any) => player.id === playerData.id);
        const maxStreakDate = streakData?.max_streak_date || null;

        // XP breakdown data with default values (for players with no XP or not in the view)
        let xpBreakdownData = { reserve_games: 0, reserve_xp: 0 };
        
        try {
          // The player_xp_breakdown view filters out players with zero XP
          // We're conditionally skipping this query for Johnny, who we know isn't in the view
          if (playerData.friendly_name !== 'Johnny') {
            const result = await executeWithRetry(
              () => supabase
                .from('player_xp_breakdown')
                .select('reserve_games, reserve_xp')
                .eq('friendly_name', playerData.friendly_name)
                .maybeSingle()
            );
            
            // If we got valid data, use it; otherwise keep defaults
            if (result.data) {
              xpBreakdownData = result.data;
            }
            
            // Only log actual errors, not 'not found' situations
            if (result.error && !result.error.message?.includes('404')) {
              console.error('Error fetching XP breakdown:', result.error);
              // Don't show toast error since we're handling it gracefully
            }
          } else {
            console.log('Skipping XP breakdown query for Johnny (known to have no XP data)');
          }
        } catch (error) {
          console.error('Unexpected error fetching XP breakdown:', error);
          // Still continue with default values
        }

        console.log('[PlayerProfile] Player data:', { 
          id: playerData?.id,
          friendly_name: playerData?.friendly_name,
          xp_breakdown: xpBreakdownData,
          params: { id: params.id, friendlyName: params.friendlyName }
        });

        // Get count of unpaid games using the player_unpaid_games_view
        const { data: unpaidGamesData, error: unpaidError } = await executeWithRetry(
          () => supabase
            .from('player_unpaid_games_view')
            .select('count')
            .eq('player_id', playerData.id)
            .single()
        );

        if (unpaidError) {
          console.error('Error fetching unpaid games:', unpaidError);
          toast.error('Failed to load unpaid games data');
          return;
        }

        const unpaidGamesCount = unpaidGamesData?.count || 0;

        // Fetch registration streak data
        let registrationStreakData = null;
        try {
          const { data: streakData, error: streakError } = await executeWithRetry(
            () => supabase
              .from('player_current_registration_streak_bonus')
              .select('current_streak_length, bonus_applies')
              .eq('friendly_name', playerData.friendly_name)
              .maybeSingle()
          );
          
          console.log('[PlayerProfile] Registration streak query result:', {
            friendly_name: playerData.friendly_name,
            data: streakData,
            error: streakError
          });
          
          if (!streakError && streakData) {
            registrationStreakData = streakData;
          } else if (streakError) {
            console.error('Error fetching registration streak:', streakError);
          }
        } catch (regStreakError) {
          console.error('Error fetching registration streak:', regStreakError);
          // Continue without registration streak data
        }

        // Get win rates for player
        const { data: winRates } = await supabase.rpc('get_player_win_rates');
        let winRate = null;
        if (winRates) {
          const playerWinRate = winRates.find((wr: any) => wr.id === playerData.id);
          if (playerWinRate) {
            winRate = playerWinRate.win_rate;
          }
        }

        // Get recent win rates (last 10 games)
        const { data: recentWinRates } = await supabase.rpc('get_player_recent_win_rates');
        let recentWinRate = null;
        if (recentWinRates) {
          const playerRecentWinRate = recentWinRates.find((wr: any) => wr.id === playerData.id);
          if (playerRecentWinRate) {
            recentWinRate = playerRecentWinRate.recent_win_rate;
          }
        }
        
        // Fetch player streak stats for the correct max streak value
        const { data: streakStatsData, error: streakStatsError } = await executeWithRetry(
          () => supabase
            .from('player_streak_stats')
            .select('friendly_name, longest_streak, longest_streak_period')
            .eq('friendly_name', playerData.friendly_name)
            .maybeSingle()
        );
        
        if (streakStatsError) {
          console.error('Error fetching streak stats:', streakStatsError);
          // Continue without streak stats rather than failing completely
        }
        
        // Use the max streak from player_streak_stats if available
        const correctMaxStreak = streakStatsData?.longest_streak || playerData.max_streak || 0;
        console.log('Max streak comparison:', {
          from_players_table: playerData.max_streak,
          from_streak_stats: streakStatsData?.longest_streak,
          using: correctMaxStreak
        });

        // Get highest XP record for the player
        const { data: highestXPData, error: highestXPError } = await executeWithRetry(
          () => supabase
            .from('highest_xp_records_view')
            .select('xp, snapshot_date')
            .eq('player_id', playerData.id)
            // Don't use single() to avoid 406 errors when no data exists
        );

        if (highestXPError) {
          console.error('Error fetching highest XP data:', highestXPError);
          // Continue without highest XP data rather than failing completely
        }
        
        // Check if we got any data back (will be an array)
        const highestXPRecord = Array.isArray(highestXPData) && highestXPData.length > 0 ? highestXPData[0] : null;

        // Format the highest XP date if available
        let highestXPDate = null;
        if (highestXPRecord?.snapshot_date) {
          highestXPDate = formatDate(highestXPRecord.snapshot_date);
        }

        // Get current user's player ID if logged in
        let currentPlayerId = null;
        if (user) {
          const { data: currentPlayer, error: currentPlayerError } = await executeWithRetry(
            () => supabase
              .from('players')
              .select('id')
              .eq('user_id', user.id)
              .single()
          );

          if (currentPlayerError) {
            console.error('Error fetching current player:', currentPlayerError);
            toast.error('Failed to load current player data');
            return;
          }
          currentPlayerId = currentPlayer?.id;
        }

        // Get games played together and rating if logged in
        let gamesPlayedTogether = 0;
        let myRating = null;
        
        if (currentPlayerId) {
          // Get games played together using a raw count query
          const { data: gamesCount, error: gamesCountError } = await executeWithRetry(
            () => supabase.rpc('count_games_played_together', {
              player_one_id: currentPlayerId,
              player_two_id: playerData.id
            })
          );
            
          if (gamesCountError) {
            console.error('Error fetching games played together:', gamesCountError);
            toast.error('Failed to load games played together');
            return;
          }

          gamesPlayedTogether = gamesCount || 0;

          // Get current user's rating for this player
          const { data: ratingData, error: ratingError } = await executeWithRetry(
            () => supabase
              .from('player_ratings')
              .select('attack_rating, defense_rating, game_iq_rating, has_pace, has_shooting, has_passing, has_dribbling, has_defending, has_physical')
              .eq('rater_id', currentPlayerId)
              .eq('rated_player_id', playerData.id)
              .maybeSingle()
          );
            
          if (ratingError && !ratingError.message?.includes('404')) {
            console.error('Error fetching rating:', ratingError);
            toast.error('Failed to load rating data');
            return;
          }

          myRating = ratingData;
        }

        // Get game history with team sizes and status
        const { data: gameData, error: gameError } = await executeWithRetry(
          () => supabase
            .from('game_registrations')
            .select(`
              team,
              status,
              game:game_id(
                id,
                sequence_number,
                date,
                outcome,
                score_blue,
                score_orange,
                is_historical,
                needs_completion,
                completed
              )
            `)
            .eq('player_id', playerData.id)
            .eq('game.is_historical', true)
            .eq('game.needs_completion', false)
            .eq('game.completed', true)
            // Only show games where player was on blue or orange team
            .in('team', ['blue', 'orange'])
            .order('game(sequence_number)', { ascending: false })
        );

        if (gameError) {
          console.error('Error fetching game history:', gameError);
          toast.error('Failed to load game history data');
          return;
        }

        // Get team sizes for each game
        const validGames = gameData?.filter(g => g.game !== null) || [];
        const gameIds = validGames.map(g => g.game.id);
        
        if (gameIds.length === 0) {
          setGames([]);
          return;
        }

        const { data: teamSizes, error: teamSizesError } = await executeWithRetry(
          () => supabase
            .from('game_registrations')
            .select('game_id, team')
            .in('game_id', gameIds)
            .eq('status', 'selected')
        );

        if (teamSizesError) {
          console.error('Error fetching team sizes:', teamSizesError);
          toast.error('Failed to load team sizes data');
          return;
        }

        // Calculate team sizes for each game
        const teamSizeMap = teamSizes?.reduce((acc, reg) => {
          if (!acc[reg.game_id]) {
            acc[reg.game_id] = { blue: 0, orange: 0 };
          }
          if (reg.team === 'blue') {
            acc[reg.game_id].blue++;
          } else if (reg.team === 'orange') {
            acc[reg.game_id].orange++;
          }
          return acc;
        }, {} as Record<string, { blue: number; orange: number }>);

        // Transform game history data
        const gamesWithTeamSizes = validGames.map(reg => ({
          ...reg,
          games: {
            ...reg.game,
            team_sizes: {
              blue: teamSizeMap?.[reg.game.id]?.blue || 0,
              orange: teamSizeMap?.[reg.game.id]?.orange || 0
            }
          }
        }));

        setGames(gamesWithTeamSizes);

        // Transform player data
        const playerStats: PlayerStats = {
          id: playerData.id,
          user_id: playerData.user_id,
          friendly_name: playerData.friendly_name,
          avatar_svg: playerData.avatar_svg,
          caps: playerData.caps || 0,
          active_bonuses: playerData.active_bonuses || 0,
          active_penalties: playerData.active_penalties || 0,
          current_streak: playerData.current_streak || 0,
          max_streak: correctMaxStreak,
          max_streak_date: maxStreakDate ? formatDate(maxStreakDate) : null,
          whatsapp_group_member: playerData.whatsapp_group_member,
          xp: playerData.player_xp?.xp || 0,
          rarity: playerData.player_xp?.rarity || 'Amateur',
          win_rate: winRate,
          recent_win_rate: recentWinRate,
          reserve_xp: xpBreakdownData?.reserve_xp || 0,
          reserve_games: xpBreakdownData?.reserve_games || 0,
          bench_warmer_streak: playerData.bench_warmer_streak || 0,
          token_status: tokenStatus,
          games_played_together: gamesPlayedTogether,
          my_rating: myRating ? { 
            attack_rating: myRating.attack_rating, 
            defense_rating: myRating.defense_rating,
            game_iq_rating: myRating.game_iq_rating || 0
          } : null,
          unpaidGames: unpaidGamesCount,
          registrationStreak: registrationStreakData?.current_streak_length || 0,
          registrationStreakApplies: registrationStreakData?.bonus_applies || false,
          gameHistory: validGames
            .filter((reg: any) => reg.game?.is_historical)
            .map((reg: any) => ({
              sequence: reg.game?.sequence_number || 0,
              status: reg.status
            }))
            .filter((game: any) => game.sequence !== undefined) || [],
          highest_xp: highestXPRecord?.xp || 0,
          highest_xp_date: highestXPDate
        };

        console.log('[PlayerProfile] Setting player stats:', { 
          playerStats: {
            ...playerStats,
            gameHistory: playerStats.gameHistory.length + ' games'
          }
        });

        setPlayer(playerStats);
        setLatestSequence(latestSequence);
      } catch (error: any) {
        console.error('Error loading player profile:', error);
        toast.error('Failed to load player data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (params.id || params.friendlyName) {
      fetchPlayerData();
    }
  }, [params.id, params.friendlyName, user]);

  const handleRatingSubmit = async () => {
    if (!user?.id || !player) return;

    try {
      // Get current player's ID
      const { data: currentPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentPlayer) {
        toast.error('Could not find your player profile');
        return;
      }

      const ratingData: any = {
        rater_id: currentPlayer.id,
        rated_player_id: player.id,
        attack_rating: ratings.attack,
        defense_rating: ratings.defense,
        game_iq_rating: ratings.gameIq
      };

      // Save attributes directly to database columns
      if (selectedAttributes) {
        ratingData.has_pace = selectedAttributes.has_pace || false;
        ratingData.has_shooting = selectedAttributes.has_shooting || false;
        ratingData.has_passing = selectedAttributes.has_passing || false;
        ratingData.has_dribbling = selectedAttributes.has_dribbling || false;
        ratingData.has_defending = selectedAttributes.has_defending || false;
        ratingData.has_physical = selectedAttributes.has_physical || false;

        // Also try to find matching playstyle for backward compatibility
        const matchingPlaystyle = availablePlaystyles.find(ps => {
          return (
            (ps.pace_weight > 0) === selectedAttributes.has_pace &&
            (ps.shooting_weight > 0) === selectedAttributes.has_shooting &&
            (ps.passing_weight > 0) === selectedAttributes.has_passing &&
            (ps.dribbling_weight > 0) === selectedAttributes.has_dribbling &&
            (ps.defending_weight > 0) === selectedAttributes.has_defending &&
            (ps.physical_weight > 0) === selectedAttributes.has_physical
          );
        });

        if (matchingPlaystyle) {
          ratingData.playstyle_id = matchingPlaystyle.id;
        } else {
          ratingData.playstyle_id = null; // Clear if no match
        }
      } else {
        // Clear attributes if none selected
        ratingData.has_pace = false;
        ratingData.has_shooting = false;
        ratingData.has_passing = false;
        ratingData.has_dribbling = false;
        ratingData.has_defending = false;
        ratingData.has_physical = false;
        ratingData.playstyle_id = null;
      }

      const { error } = await supabase
        .from('player_ratings')
        .upsert(ratingData, {
          onConflict: 'rater_id,rated_player_id'
        });

      if (error) throw error;

      toast.success(`Successfully rated ${player.friendly_name}`);
      setShowRatingModal(false);
      setSelectedAttributes(null);
      
      // Refresh player data to update ratings
      const { data: myRating, error: ratingError } = await supabase
        .from('player_ratings')
        .select('attack_rating, defense_rating, game_iq_rating')
        .eq('rater_id', currentPlayer.id)
        .eq('rated_player_id', player.id)
        .maybeSingle();

      if (ratingError) {
        throw ratingError;
      } else if (player) {
        setPlayer({
          ...player,
          my_rating: myRating ? { 
            attack_rating: myRating.attack_rating, 
            defense_rating: myRating.defense_rating,
            game_iq_rating: myRating.game_iq_rating || 0
          } : null
        });
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Player not found</h2>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container mx-auto px-4 py-8"
    >
      <PlayerHeader player={player} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Stats Grid - Full Width */}
        <div className="w-full">
          {console.log('Player data being passed to StatsGrid:', {
            id: player.id,
            friendly_name: player.friendly_name,
            xp: player.xp,
            highest_xp: player.highest_xp,
            highest_xp_date: player.highest_xp_date,
            current_streak: player.current_streak,
            max_streak: player.max_streak,
            max_streak_date: player.max_streak_date,
            active_bonuses: player.active_bonuses,
            active_penalties: player.active_penalties,
            rarity: player.rarity,
            win_rate: player.win_rate,
            recent_win_rate: player.recent_win_rate,
            caps: player.caps
          })}
          <StatsGrid stats={{
            id: player.id,
            friendly_name: player.friendly_name,
            xp: player.xp,
            highest_xp: player.highest_xp,
            highest_xp_date: player.highest_xp_date,
            current_streak: player.current_streak,
            max_streak: player.max_streak,
            max_streak_date: player.max_streak_date,
            active_bonuses: player.active_bonuses,
            active_penalties: player.active_penalties,
            rarity: player.rarity,
            win_rate: player.win_rate,
            recent_win_rate: player.recent_win_rate,
            caps: player.caps
          }} />
        </div>

        {/* XP Breakdown - Full Width */}
        {player && (
          <div className="w-full">
            <XPBreakdown
              stats={{
                caps: player.caps || 0,
                activeBonuses: player.active_bonuses || 0,
                activePenalties: player.active_penalties || 0,
                currentStreak: player.current_streak || 0,
                gameHistory: player.gameHistory || [],
                latestSequence: latestSequence,
                xp: player.xp,
                reserveXP: player.reserve_xp || 0,
                reserveCount: player.reserve_games || 0,
                benchWarmerStreak: player.bench_warmer_streak || 0,
                registrationStreak: player.registrationStreak || 0,
                registrationStreakApplies: player.registrationStreakApplies || false,
                unpaidGames: player.unpaidGames || 0
              }}
              showTotal={true}
            />
          </div>
        )}
        
        {/* Win Rate Graph - Directly below XP Breakdown */}
        {player && games.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full mt-6"
          >
            <WinRateGraph 
              userGameData={games} 
              getGameOutcome={getGameOutcome} 
              officialWinRate={player.win_rate} 
              className="w-full"
            /> 
          </motion.div>
        )}

        {/* Priority Token Status - Full Width */}
        {player && tokenStatus && (
          <div className="col-span-12 lg:col-span-4 xl:col-span-3">
            <div className="sticky top-4">
              <TokenStatus 
                status={tokenStatus?.status || 'NO_TOKEN'}
                lastUsedAt={tokenStatus?.lastUsedAt}
                nextTokenAt={tokenStatus?.nextTokenAt}
                createdAt={tokenStatus?.createdAt}
                isEligible={tokenStatus?.isEligible}
                recentGames={tokenStatus?.recentGames}
                hasPlayedInLastTenGames={tokenStatus?.hasPlayedInLastTenGames}
                hasRecentSelection={tokenStatus?.hasRecentSelection}
                hasOutstandingPayments={tokenStatus?.hasOutstandingPayments}
                outstandingPaymentsCount={tokenStatus?.outstandingPaymentsCount}
                playerName={player.friendly_name}
                whatsappGroupMember={player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy'}
                isLoading={tokenLoading}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Only show PlayerRating if not viewing own profile */}
      {(!user || user.id !== player.user_id) && (
        <div id="player-rating" className="mt-12">
          <PlayerRating
            player={player}
            user={user}
            onRatePlayer={async () => {
              setRatings({
                attack: player.my_rating?.attack_rating || 0,
                defense: player.my_rating?.defense_rating || 0,
                gameIq: player.my_rating?.game_iq_rating || 0
              });

              // Load existing playstyle attributes if available
              if (user) {
                const { data: currentPlayer } = await supabase
                  .from('players')
                  .select('id')
                  .eq('user_id', user.id)
                  .single();

                if (currentPlayer) {
                  const { data: existingRating } = await supabase
                    .from('player_ratings')
                    .select('has_pace, has_shooting, has_passing, has_dribbling, has_defending, has_physical')
                    .eq('rater_id', currentPlayer.id)
                    .eq('rated_player_id', player.id)
                    .maybeSingle();

                  if (existingRating) {
                    const attributes: AttributeCombination = {
                      has_pace: existingRating.has_pace || false,
                      has_shooting: existingRating.has_shooting || false,
                      has_passing: existingRating.has_passing || false,
                      has_dribbling: existingRating.has_dribbling || false,
                      has_defending: existingRating.has_defending || false,
                      has_physical: existingRating.has_physical || false
                    };

                    // Only set if at least one attribute is true
                    const hasAnyAttribute = Object.values(attributes).some(v => v);
                    if (hasAnyAttribute) {
                      setSelectedAttributes(attributes);
                    }
                  }
                }
              }

              setShowRatingModal(true);
            }}
            ratings={ratings}
            setRatings={setRatings}
          />
        </div>
      )}

      {/* Show message if viewing own profile */}
      {user && user.id === player.user_id && (
        <motion.div
          id="player-rating"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-base-100 shadow-xl mt-12"
        >
          <div className="card-body">
            <h2 className="card-title">Player Rating</h2>
            <p className="text-gray-500">You cannot rate yourself</p>
          </div>
        </motion.div>
      )}

      {/* Win Rate Graph moved above */}

      {/* Game History */}
      <div id="game-history" className="bg-base-100 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Game History</h2>
        <FilterHeader filters={filters} setFilters={setFilters} />
        {games.length > 0 ? (
          <GameHistoryTable
            games={sortAndFilterGames(games)}
            sortConfig={sortConfig}
            handleSort={handleSort}
            getGameOutcome={getGameOutcome}
          />
        ) : (
          <p className="text-center py-4">No games found</p>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          player={player}
          ratings={ratings}
          setRatings={setRatings}
          selectedAttributes={selectedAttributes}
          onAttributesChange={setSelectedAttributes}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedAttributes(null);
          }}
          onSubmit={handleRatingSubmit}
        />
      )}
    </motion.div>
  );
}
