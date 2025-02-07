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
  const [ratings, setRatings] = useState<{ attack: number; defense: number }>({
    attack: 0,
    defense: 0,
  });

  // Use custom hook for game history management
  const {
    sortConfig,
    filters,
    setFilters,
    handleSort,
    sortAndFilterGames,
    getGameOutcome
  } = useGameHistory();

  useEffect(() => {
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

        // Get player stats - using either ID or friendly name
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
            player_xp (
              xp,
              rank,
              rarity
            )
          `);

        // Apply the appropriate filter based on the parameter we received
        const { data: playerData, error: playerError } = await executeWithRetry(
          () => params.id 
            ? playerQuery.eq('id', params.id)
            : playerQuery.ilike('friendly_name', fromUrlFriendly(params.friendlyName || '')).single()
        );

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

        // Get player XP breakdown data using friendly_name
        const { data: xpBreakdownData, error: xpBreakdownError } = await executeWithRetry(
          () => supabase
            .from('player_xp_breakdown')
            .select('reserve_games, reserve_xp')
            .eq('friendly_name', playerData.friendly_name)
            .single()
        );

        if (xpBreakdownError) {
          console.error('Error fetching XP breakdown:', xpBreakdownError);
          toast.error('Failed to load XP breakdown data');
          return;
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

        // Get player win rates
        const { data: winRatesData, error: winRatesError } = await executeWithRetry(
          () => supabase.rpc('get_player_win_rates')
        );

        if (winRatesError) {
          console.error('Error fetching win rates:', winRatesError);
          toast.error('Failed to load win rate data');
          return;
        }

        // Find win rate data for this player
        const playerWinRates = winRatesData?.find(wr => wr.id === playerData.id);

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
              .select('attack_rating, defense_rating')
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

        // Get token status
        const { data: tokenData, error: tokenError } = await executeWithRetry(
          () => supabase
            .from('player_tokens')
            .select('*')
            .eq('player_id', playerData.id)
            .order('issued_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          { 
            shouldToast: false,
            maxRetries: 2 // Reduce retries for optional data
          }
        );

        if (tokenError) {
          // Only log 404s, don't show to user as it's expected when no token exists
          if (tokenError.code === '404' || tokenError.message?.includes('404')) {
            console.log('No token found for user:', playerData.friendly_name);
          } else {
            console.error('Error fetching token data:', tokenError);
          }
        }

        // Determine token status
        const tokenStatus = tokenData ? {
          status: tokenData.used_at ? 'USED' : 'AVAILABLE',
          last_used_at: tokenData.used_at,
          next_token_at: tokenData.used_at ? new Date(new Date(tokenData.used_at).getTime() + (22 * 24 * 60 * 60 * 1000)).toISOString() : null,
          created_at: tokenData.issued_at
        } : {
          status: 'NO_TOKEN',
          last_used_at: null,
          next_token_at: null,
          created_at: new Date().toISOString()
        };

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
          max_streak: playerData.max_streak || 0,
          xp: playerData.player_xp?.xp || 0,
          rarity: playerData.player_xp?.rarity || 'Amateur',
          wins: playerWinRates?.wins || 0,
          totalGames: (playerWinRates?.wins || 0) + (playerWinRates?.draws || 0) + (playerWinRates?.losses || 0),
          win_rate: playerWinRates?.win_rate || 0,
          gameHistory: validGames
            .filter(reg => reg.game?.is_historical)
            .map(reg => ({
              sequence: reg.game?.sequence_number,
              status: reg.status
            }))
            .filter(game => game.sequence !== undefined) || [],
          games_played_together: gamesPlayedTogether,
          my_rating: myRating,
          reserveXP: xpBreakdownData?.reserve_xp || 0,
          reserveCount: xpBreakdownData?.reserve_games || 0,
          bench_warmer_streak: playerData.bench_warmer_streak || 0,
          unpaidGames: unpaidGamesCount,
          registrationStreak: 0,
          registrationStreakApplies: false,
          token_status: tokenStatus
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

      const { error } = await supabase
        .from('player_ratings')
        .upsert(
          {
            rater_id: currentPlayer.id,
            rated_player_id: player.id,
            attack_rating: ratings.attack,
            defense_rating: ratings.defense
          },
          {
            onConflict: 'rater_id,rated_player_id'
          }
        );

      if (error) throw error;

      toast.success(`Successfully rated ${player.friendly_name}`);
      setShowRatingModal(false);
      
      // Refresh player data to update ratings
      const { data: myRating, error: ratingError } = await supabase
        .from('player_ratings')
        .select('attack_rating, defense_rating')
        .eq('rater_id', currentPlayer.id)
        .eq('rated_player_id', player.id)
        .maybeSingle();

      if (ratingError) {
        throw ratingError;
      } else if (player) {
        setPlayer({
          ...player,
          my_rating: myRating || null
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
          <StatsGrid profile={{
            total_xp: player.xp,
            current_streak: player.current_streak,
            max_streak: player.max_streak,
            active_bonuses: player.active_bonuses,
            active_penalties: player.active_penalties,
            rarity: player.rarity
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
                reserveXP: player.reserveXP ?? 0,
                reserveCount: player.reserveCount ?? 0,
                benchWarmerStreak: player.bench_warmer_streak || 0,
                registrationStreak: player.registrationStreak || 0,
                registrationStreakApplies: player.registrationStreakApplies || false,
                unpaidGames: player.unpaidGames || 0
              }}
              showTotal={true}
            />
          </div>
        )}

        {/* Priority Token Status - Full Width */}
        {player && (
          <div className="w-full">
            <TokenStatus
              status={player.token_status?.status}
              lastUsedAt={player.token_status?.last_used_at}
              nextTokenAt={player.token_status?.next_token_at}
              createdAt={player.token_status?.created_at}
              playerName={player.friendly_name}
            />
          </div>
        )}
      </motion.div>

      {/* Only show PlayerRating if not viewing own profile */}
      {(!user || user.id !== player.user_id) && (
        <div id="player-rating" className="mt-12">
          <PlayerRating
            player={player}
            user={user}
            onRatePlayer={() => {
              setRatings({
                attack: player.my_rating?.attack_rating || 0,
                defense: player.my_rating?.defense_rating || 0
              });
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
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleRatingSubmit}
        />
      )}
    </motion.div>
  );
}
