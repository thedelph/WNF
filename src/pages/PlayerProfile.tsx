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
  const { user } = useAuth();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratings, setRatings] = useState<{ attack: number; defense: number }>({
    attack: 0,
    defense: 0,
  });

  // Sorting and filtering states
  const [sortConfig, setSortConfig] = useState<{ key: keyof GameHistory['games'] | 'team', direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });
  const [filters, setFilters] = useState({
    dateRange: {
      start: null as Date | null,
      end: null as Date | null
    },
    team: '' as '' | 'Blue' | 'Orange',
    outcome: '' as '' | 'Won' | 'Lost' | 'Draw' | 'Unknown'
  });

  // Sort and filter functions
  const sortAndFilterGames = (games: GameHistory[]) => {
    let filteredGames = [...games].filter(game => game && game.games);

    // Apply filters
    if (filters.dateRange.start || filters.dateRange.end) {
      filteredGames = filteredGames.filter(game => {
        if (!game.games?.date) return false;
        const gameDate = new Date(game.games.date);
        const afterStart = !filters.dateRange.start || gameDate >= filters.dateRange.start;
        const beforeEnd = !filters.dateRange.end || gameDate <= filters.dateRange.end;
        return afterStart && beforeEnd;
      });
    }

    if (filters.team) {
      filteredGames = filteredGames.filter(game =>
        game.team && game.team.toLowerCase() === filters.team.toLowerCase()
      );
    }

    if (filters.outcome) {
      filteredGames = filteredGames.filter(game => {
        const outcome = getGameOutcome(game);
        return outcome === filters.outcome;
      });
    }

    // Apply sorting
    filteredGames.sort((a, b) => {
      if (sortConfig.key === 'date') {
        if (!a.games?.date || !b.games?.date) return 0;
        const dateA = new Date(a.games.date).getTime();
        const dateB = new Date(b.games.date).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortConfig.key === 'team') {
        if (!a.team || !b.team) return 0;
        return sortConfig.direction === 'asc'
          ? a.team.localeCompare(b.team)
          : b.team.localeCompare(a.team);
      }
      return 0;
    });

    return filteredGames;
  };

  const getGameOutcome = (game: GameHistory): string => {
    if (!game?.games?.outcome) return 'Unknown';
    if (game.games.outcome === 'draw') return 'Draw';
    if (!game?.team) return 'Unknown';
    
    const team = game.team.toLowerCase();
    const isWin = (team === 'blue' && game.games.outcome === 'blue_win') ||
                 (team === 'orange' && game.games.outcome === 'orange_win');
    return isWin ? 'Won' : 'Lost';
  };

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        // Get latest game sequence first
        const { data: latestSequenceData, error: sequenceError } = await supabase
          .from('games')
          .select('sequence_number')
          .order('sequence_number', { ascending: false })
          .limit(1);

        if (sequenceError) throw sequenceError;
        const latestSequence = Number(latestSequenceData[0]?.sequence_number || 0);

        // Fetch player data
        const { data: playerData, error: playerError } = await supabase
          .from('player_stats')
          .select('*')
          .eq('id', id)
          .single();

        if (playerError) throw playerError;

        // If user is logged in, get games played together and rating
        if (user?.id) {
          // First get the current player's ID from the players table
          const { data: currentPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (currentPlayer) {
            // Get games played together
            const { data: gamesCount, error: gamesCountError } = await supabase
              .rpc('get_players_with_game_count', {
                current_player_id: currentPlayer.id
              });

            if (gamesCountError) {
              console.error('Error fetching games count:', gamesCountError);
            } else if (Array.isArray(gamesCount)) {
              // Find the games count for the specific player we're viewing
              const playerGameCount = gamesCount.find((p: any) => p.id === id);
              playerData.games_played_together = playerGameCount?.games_played || 0;
            }

            // Get rating if exists
            const { data: myRating, error: ratingError } = await supabase
              .from('player_ratings')
              .select('attack_rating, defense_rating')
              .eq('rater_id', currentPlayer.id)
              .eq('rated_player_id', id)
              .maybeSingle();

            if (ratingError) {
              console.error('Error fetching player rating:', ratingError);
            }

            playerData.my_rating = myRating || null;
          }
        }

        // Fetch game registrations with sequence numbers
        const { data: gamesData, error: gamesError } = await supabase
          .from('game_registrations')
          .select(`
            game_id,
            team,
            paid,
            games!inner (
              date,
              outcome,
              score_blue,
              score_orange,
              sequence_number
            )
          `)
          .eq('player_id', id)
          .order('games(sequence_number)', { ascending: false });

        if (gamesError) {
          console.error('Games fetch error:', gamesError);
          throw gamesError;
        }

        // Get game sequences for XP calculation
        const gameSequences = gamesData
          .filter(game => game.games?.sequence_number != null)
          .map(game => Number(game.games.sequence_number))
          .filter(seq => !isNaN(seq))
          .sort((a, b) => b - a);

        // Transform the data to match the GameHistory interface
        const processedGames: GameHistory[] = gamesData
          .filter(game => game && game.games)
          .map(game => ({
            game_id: game.game_id,
            team: game.team,
            paid: game.paid,
            games: {
              date: game.games?.date || '',
              outcome: game.games?.outcome || null,
              score_blue: game.games?.score_blue || 0,
              score_orange: game.games?.score_orange || 0
            },
            date: game.games?.date || '',
            outcome: game.games?.outcome || null,
            score_blue: game.games?.score_blue || 0,
            score_orange: game.games?.score_orange || 0
          }));

        // Calculate win rate
        const gamesWithKnownOutcome = processedGames.filter(game =>
          game.games?.outcome !== null
        );
        
        const wins = gamesWithKnownOutcome.filter(game => {
          const team = game.team.toLowerCase();
          return (team === 'blue' && game.games.outcome === 'blue_win') ||
                 (team === 'orange' && game.games.outcome === 'orange_win');
        });

        const winRate = gamesWithKnownOutcome.length > 0 
          ? Number(((wins.length / gamesWithKnownOutcome.length) * 100).toFixed(1))
          : 0;

        // Update player data with calculated win rate and sequences
        const updatedPlayerData = {
          ...playerData,
          win_rate: winRate,
          game_sequences: gameSequences,
          latest_sequence: latestSequence
        };

        setPlayer(updatedPlayerData);
        setGames(processedGames);
      } catch (error) {
        console.error('Error fetching player data:', error);
        toast.error('Failed to load player profile');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlayerData();
    }
  }, [id, user?.id]);

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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
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
          latestSequence: player.latest_sequence
        }} />
      </motion.div>

      <StatsGrid player={player} />

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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-white rounded-lg p-6 max-w-md w-full space-y-4"
          >
            <h2 className="text-xl font-semibold">
              Rate {player?.friendly_name}
            </h2>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Attack Rating</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={ratings.attack}
                  onChange={(e) => setRatings(prev => ({ ...prev, attack: parseInt(e.target.value) }))}
                  className="range range-primary"
                  step="0.5"
                />
                <div className="text-center mt-2">{ratings.attack / 2} stars</div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Defense Rating</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={ratings.defense}
                  onChange={(e) => setRatings(prev => ({ ...prev, defense: parseInt(e.target.value) }))}
                  className="range range-primary"
                  step="0.5"
                />
                <div className="text-center mt-2">{ratings.defense / 2} stars</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-ghost"
                onClick={() => setShowRatingModal(false)}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary"
                onClick={handleRatingSubmit}
              >
                Submit Rating
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
