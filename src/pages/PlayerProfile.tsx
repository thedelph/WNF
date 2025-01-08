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

        // Get player stats and XP
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select(`
            id,
            friendly_name,
            avatar_svg,
            caps,
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak,
            win_rate,
            player_xp!left (
              xp
            ),
            user_id
          `)
          .eq('id', id)
          .single();

        if (playerError) throw playerError;

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

        // Get game history
        const { data: gameData, error: gameError } = await supabase
          .from('game_registrations')
          .select(`
            team,
            games (
              id,
              date,
              sequence_number,
              outcome,
              is_historical,
              score_blue,
              score_orange
            )
          `)
          .eq('player_id', id)
          .order('games(date)', { ascending: false });

        if (gameError) throw gameError;

        // Transform player data
        const playerStats: PlayerStats = {
          id: playerData.id,
          friendly_name: playerData.friendly_name,
          avatar_svg: playerData.avatar_svg,
          caps: playerData.caps || 0,
          active_bonuses: playerData.active_bonuses || 0,
          active_penalties: playerData.active_penalties || 0,
          current_streak: playerData.current_streak || 0,
          max_streak: playerData.max_streak || 0,
          xp: playerData.player_xp?.xp || 0,
          win_rate: playerData.win_rate || 0,
          game_sequences: gameData
            ?.filter(reg => reg.games?.is_historical)
            .map(reg => reg.games?.sequence_number)
            .filter(Boolean) || [],
          games_played_together: gamesPlayedTogether,
          my_rating: myRating,
          user_id: playerData.user_id
        };

        setPlayer(playerStats);
        setGames(gameData || []);

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
        <XPBreakdown stats={{
          caps: player.caps || 0,
          activeBonuses: player.active_bonuses || 0,
          activePenalties: player.active_penalties || 0,
          currentStreak: player.current_streak || 0,
          gameSequences: player.game_sequences,
          latestSequence: latestSequence,
          xp: player.xp || 0
        }} />
      </motion.div>

      <StatsGrid player={player} />

      {/* Only show PlayerRating if not viewing own profile */}
      {(!user || user.id !== player.user_id) && (
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
      )}

      {/* Show message if viewing own profile */}
      {user && user.id === player.user_id && (
        <motion.div
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
      <div className="bg-base-100 rounded-lg p-6 shadow-lg">
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
