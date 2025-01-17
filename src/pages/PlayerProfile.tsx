import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { PlayerHeader } from '../components/profile/PlayerHeader';
import { StatsGrid } from '../components/profile/StatsGrid';
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

/**
 * PlayerProfile component displays detailed information about a player
 * including their stats, ratings, and game history.
 */
export default function PlayerProfileNew() {
  const { id } = useParams<{ id: string }>();
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
        const { data: latestSeqData, error: latestSeqError } = await supabase
          .from('games')
          .select('sequence_number')
          .eq('completed', true)
          .order('sequence_number', { ascending: false })
          .limit(1)
          .single();

        if (latestSeqError) throw latestSeqError;
        setLatestSequence(latestSeqData?.sequence_number || 0);

        // Get player stats
        const { data: playerData, error: playerError } = await supabase
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
          `)
          .eq('id', id)
          .single();

        if (playerError) {
          console.error('Error fetching player data:', playerError);
          throw playerError;
        }

        // Get reserve XP data
        const { data: reserveXPData, error: reserveXPError } = await supabase
          .from('reserve_xp_transactions')
          .select('xp_amount')
          .eq('player_id', id);

        if (reserveXPError) {
          console.error('Error fetching reserve XP:', reserveXPError);
          throw reserveXPError;
        }

        // Debug log for reserve data
        console.log('Reserve XP Data:', reserveXPData);

        // Get all registrations for historical games
        const { data: registrations, error: registrationsError } = await supabase
          .from('game_registrations')
          .select(`
            status,
            games!inner (
              sequence_number,
              is_historical
            )
          `)
          .eq('player_id', id)
          .eq('games.is_historical', true);

        if (registrationsError) {
          console.error('Error fetching registrations:', registrationsError);
          throw registrationsError;
        }

        // Count reserve appearances
        const reserveCount = registrations?.filter(reg => reg.status === 'reserve').length || 0;
        // Each reserve appearance gives 5 XP
        const reserveXP = reserveCount * 5;

        console.log('Calculated from game history:', { reserveCount, reserveXP });

        // Get player win rates
        const { data: winRatesData, error: winRatesError } = await supabase
          .rpc('get_player_win_rates');

        if (winRatesError) {
          console.error('Error fetching win rates:', winRatesError);
          throw winRatesError;
        }

        // Find win rate data for this player
        const playerWinRates = winRatesData?.find(wr => wr.id === id);

        // Get current user's player ID if logged in
        let currentPlayerId = null;
        if (user) {
          const { data: currentPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('user_id', user.id)
            .single();
          currentPlayerId = currentPlayer?.id;
        }

        // Get games played together and rating if logged in
        let gamesPlayedTogether = 0;
        let myRating = null;
        
        if (currentPlayerId) {
          // Get games played together using a raw count query
          const { data: gamesCount } = await supabase
            .rpc('count_games_played_together', {
              player_one_id: currentPlayerId,
              player_two_id: id
            });
            
          gamesPlayedTogether = gamesCount || 0;

          // Get current user's rating for this player
          const { data: ratingData } = await supabase
            .from('player_ratings')
            .select('attack_rating, defense_rating')
            .eq('rater_id', currentPlayerId)
            .eq('rated_player_id', id)
            .maybeSingle();
            
          myRating = ratingData;
        }

        // Get game history with team sizes and status
        const { data: gameData, error: gameError } = await supabase
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
          .eq('player_id', id)
          .eq('game.is_historical', true)
          .eq('game.needs_completion', false)
          .eq('game.completed', true)
          // Only show games where player was on blue or orange team
          .in('team', ['blue', 'orange'])
          .order('game(sequence_number)', { ascending: false });

        if (gameError) throw gameError;

        // Get team sizes for each game
        const validGames = gameData?.filter(g => g.game !== null) || [];
        const gameIds = validGames.map(g => g.game.id);
        
        if (gameIds.length === 0) {
          setGames([]);
          return;
        }

        const { data: teamSizes, error: teamSizesError } = await supabase
          .from('game_registrations')
          .select('game_id, team')
          .in('game_id', gameIds)
          .eq('status', 'selected');

        if (teamSizesError) throw teamSizesError;

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
          max_streak: playerData.max_streak || 0,
          xp: playerData.player_xp?.xp || 0,
          wins: playerWinRates?.wins || 0,
          totalGames: (playerWinRates?.wins || 0) + (playerWinRates?.draws || 0) + (playerWinRates?.losses || 0),
          win_rate: playerWinRates?.win_rate || 0,
          gameHistory: gamesWithTeamSizes
            ?.filter(reg => reg.games?.is_historical)
            .map(reg => ({
              sequence: reg.games?.sequence_number,
              status: reg.status
            }))
            .filter(game => game.sequence !== undefined) || [],
          games_played_together: gamesPlayedTogether,
          my_rating: myRating,
          reserveXP: reserveXP,
          reserveCount: reserveCount,
          bench_warmer_streak: playerData.bench_warmer_streak || 0
        };

        // Debug log for final player stats
        console.log('Final Player Stats:', playerStats);

        setPlayer(playerStats);
      } catch (error) {
        console.error('Error fetching player data:', error);
        toast.error('Failed to load player data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlayerData();
    }
  }, [id]);

  const handleRatingSubmit = async () => {
    if (!user?.id || !id) return;

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
            rated_player_id: id,
            attack_rating: ratings.attack,
            defense_rating: ratings.defense
          },
          {
            onConflict: 'rater_id,rated_player_id'
          }
        );

      if (error) throw error;

      toast.success(`Successfully rated ${player?.friendly_name}`);
      setShowRatingModal(false);
      
      // Refresh player data to update ratings
      const { data: myRating, error: ratingError } = await supabase
        .from('player_ratings')
        .select('attack_rating, defense_rating')
        .eq('rater_id', currentPlayer.id)
        .eq('rated_player_id', id)
        .maybeSingle();

      if (ratingError) {
        console.error('Error fetching updated rating:', ratingError);
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
        className="mb-8"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <TooltipPrimitive.Provider>
              {!user ? (
                <Tooltip 
                  content="You must be logged in to rate players"
                  side="bottom"
                >
                  <motion.button 
                    onClick={() => {
                      toast.error('You must be logged in to rate players');
                    }}
                    className="btn h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-none btn-disabled bg-gray-400 text-gray-600 cursor-not-allowed"
                  >
                    <span className="inline-flex items-center justify-center w-4 h-4">⭐</span>
                    <span className="font-medium">RATE PLAYER</span>
                  </motion.button>
                </Tooltip>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    document.getElementById('player-rating')?.scrollIntoView({ 
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }}
                  className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-none"
                >
                  <span className="inline-flex items-center justify-center w-4 h-4">⭐</span>
                  <span className="font-medium">PLAYER RATING</span>
                </motion.button>
              )}
            </TooltipPrimitive.Provider>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                document.getElementById('game-history')?.scrollIntoView({ 
                  behavior: 'smooth',
                  block: 'start'
                });
              }}
              className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto order-2 sm:order-none"
            >
              <span className="inline-flex items-center justify-center w-4 h-4">📜</span>
              <span className="font-medium">GAME HISTORY</span>
            </motion.button>
          </div>
          <XPBreakdown stats={{
            caps: player.caps || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            gameHistory: player.gameHistory || [],
            latestSequence: latestSequence,
            xp: player.xp || 0,
            reserveXP: player.reserveXP ?? 0,
            reserveCount: player.reserveCount ?? 0,
            benchWarmerStreak: player.bench_warmer_streak || 0
          }} />
        </div>
      </motion.div>

      <StatsGrid player={player} />

      {/* Only show PlayerRating if not viewing own profile */}
      {(!user || user.id !== player.user_id) && (
        <div id="player-rating">
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
          className="card bg-base-100 shadow-xl mb-8"
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
