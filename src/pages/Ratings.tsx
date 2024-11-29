import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';

interface Player {
  id: string;
  friendly_name: string;
  games_played: number;
  current_rating?: {
    attack_rating: number;
    defense_rating: number;
  };
}

type SortOption = 'alphabetical' | 'games_played' | 'rated' | 'unrated' | 'attack_asc' | 'attack_desc' | 'defense_asc' | 'defense_desc';
type FilterOption = 'all' | 'rated' | 'unrated' | 'min_games';

export default function Ratings() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('alphabetical');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [ratings, setRatings] = useState<{ attack: number; defense: number }>({
    attack: 0,
    defense: 0,
  });

  useEffect(() => {
    fetchCurrentPlayer();
  }, [user]);

  useEffect(() => {
    if (currentPlayer) {
      fetchPlayers();
    }
  }, [user, currentPlayer]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [players, sortOption, filterOption]);

  const applyFiltersAndSort = () => {
    let result = [...players];

    // Apply filters
    switch (filterOption) {
      case 'rated':
        result = result.filter(player => player.current_rating);
        break;
      case 'unrated':
        result = result.filter(player => !player.current_rating);
        break;
      case 'min_games':
        result = result.filter(player => player.games_played >= 10);
        break;
      default:
        break;
    }

    // Apply sorting
    switch (sortOption) {
      case 'alphabetical':
        result.sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
        break;
      case 'games_played':
        result.sort((a, b) => b.games_played - a.games_played);
        break;
      case 'rated':
        result.sort((a, b) => {
          if (a.current_rating && !b.current_rating) return -1;
          if (!a.current_rating && b.current_rating) return 1;
          return 0;
        });
        break;
      case 'unrated':
        result.sort((a, b) => {
          if (!a.current_rating && b.current_rating) return -1;
          if (a.current_rating && !b.current_rating) return 1;
          return 0;
        });
        break;
      case 'attack_asc':
        result.sort((a, b) => {
          if (!a.current_rating) return 1;
          if (!b.current_rating) return -1;
          return (a.current_rating.attack_rating || 0) - (b.current_rating.attack_rating || 0);
        });
        break;
      case 'attack_desc':
        result.sort((a, b) => {
          if (!a.current_rating) return 1;
          if (!b.current_rating) return -1;
          return (b.current_rating.attack_rating || 0) - (a.current_rating.attack_rating || 0);
        });
        break;
      case 'defense_asc':
        result.sort((a, b) => {
          if (!a.current_rating) return 1;
          if (!b.current_rating) return -1;
          return (a.current_rating.defense_rating || 0) - (b.current_rating.defense_rating || 0);
        });
        break;
      case 'defense_desc':
        result.sort((a, b) => {
          if (!a.current_rating) return 1;
          if (!b.current_rating) return -1;
          return (b.current_rating.defense_rating || 0) - (a.current_rating.defense_rating || 0);
        });
        break;
      default:
        break;
    }

    setFilteredPlayers(result);
  };

  const fetchCurrentPlayer = async () => {
    try {
      if (!user?.id) return;

      const { data: player, error } = await supabase
        .from('players')
        .select('id, friendly_name')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCurrentPlayer(player);
    } catch (error: any) {
      toast.error('Error fetching current player');
      console.error('Error fetching current player:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      if (!user?.id || !currentPlayer) return;

      // Get all players and their game count with the current user
      const { data: playersWithGames, error } = await supabase
        .rpc('get_players_with_game_count', {
          current_player_id: currentPlayer.id // Use player.id instead of auth user.id
        });

      if (error) throw error;

      // Get current user's ratings
      const { data: existingRatings } = await supabase
        .from('player_ratings')
        .select('rated_player_id, attack_rating, defense_rating')
        .eq('rater_id', currentPlayer.id); // Use player.id instead of auth user.id

      // Combine the data and filter out the current user
      const enhancedPlayers = playersWithGames
        .filter((player: any) => player.id !== currentPlayer.id) // Filter using player.id
        .map((player: any) => ({
          ...player,
          current_rating: existingRatings?.find(
            (rating) => rating.rated_player_id === player.id
          )
        }));

      setPlayers(enhancedPlayers);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (!selectedPlayer || !user?.id) return;

    try {
      const { error } = await supabase
        .from('player_ratings')
        .upsert(
          {
            rater_id: currentPlayer.id,
            rated_player_id: selectedPlayer.id,
            attack_rating: ratings.attack,
            defense_rating: ratings.defense
          },
          {
            onConflict: 'rater_id,rated_player_id'
          }
        );

      if (error) throw error;

      toast.success(`Successfully rated ${selectedPlayer.friendly_name}`);
      setSelectedPlayer(null);
      fetchPlayers(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Player Ratings</h1>
      
      {/* Sort and Filter Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-2">Sort By</label>
          <select
            className="w-full p-2 border rounded-md bg-white"
            value={sortOption}
            onChange={(e) => {
              // Reset to alphabetical if switching from rated to unrated and using a rating sort
              if (
                filterOption === 'unrated' && 
                (e.target.value.includes('attack') || e.target.value.includes('defense'))
              ) {
                setSortOption('alphabetical');
                return;
              }
              setSortOption(e.target.value as SortOption);
            }}
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="games_played">Games Played</option>
            <option value="rated">Rated First</option>
            <option value="unrated">Unrated First</option>
            {filterOption !== 'unrated' && (
              <>
                <option value="attack_asc">Attack Rating (Low to High)</option>
                <option value="attack_desc">Attack Rating (High to Low)</option>
                <option value="defense_asc">Defense Rating (Low to High)</option>
                <option value="defense_desc">Defense Rating (High to Low)</option>
              </>
            )}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-2">Filter</label>
          <select
            className="w-full p-2 border rounded-md bg-white"
            value={filterOption}
            onChange={(e) => {
              const newFilter = e.target.value as FilterOption;
              // Reset sort option if switching to unrated and using a rating sort
              if (
                newFilter === 'unrated' && 
                (sortOption.includes('attack') || sortOption.includes('defense'))
              ) {
                setSortOption('alphabetical');
              }
              setFilterOption(newFilter);
            }}
          >
            <option value="all">All Players</option>
            <option value="rated">Rated Players</option>
            <option value="unrated">Unrated Players</option>
            <option value="min_games">10+ Games</option>
          </select>
        </div>
      </div>

      {/* Rating Modal */}
      {selectedPlayer && (
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
            className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 relative z-50"
          >
            <h2 className="text-xl font-semibold">
              Rate {selectedPlayer.friendly_name}
            </h2>
            
            <div className="space-y-4">
              <StarRating
                rating={ratings.attack}
                onChange={(value) => setRatings(prev => ({ ...prev, attack: value }))}
                label="Attack Rating"
              />
              <StarRating
                rating={ratings.defense}
                onChange={(value) => setRatings(prev => ({ ...prev, defense: value }))}
                label="Defense Rating"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-ghost"
                onClick={() => setSelectedPlayer(null)}
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

      {/* Players Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {loading ? (
          <div className="col-span-full text-center py-8">Loading players...</div>
        ) : filteredPlayers.length === 0 ? (
          <div className="col-span-full text-center py-8">No players found matching the current filters.</div>
        ) : (
          filteredPlayers.map((player) => (
            <motion.div
              key={player.id}
              variants={itemVariants}
              className="card bg-base-100 shadow-xl"
            >
              <div className="card-body">
                <h2 className="card-title">{player.friendly_name}</h2>
                <p>Games played together: {player.games_played}</p>
                
                {player.games_played >= 5 ? (
                  <div className="space-y-2">
                    {player.current_rating && (
                      <div className="text-sm text-gray-600">
                        <p>Current Ratings:</p>
                        <p>Attack: {player.current_rating.attack_rating / 2} stars</p>
                        <p>Defense: {player.current_rating.defense_rating / 2} stars</p>
                      </div>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSelectedPlayer(player);
                        setRatings({
                          attack: player.current_rating?.attack_rating || 0,
                          defense: player.current_rating?.defense_rating || 0
                        });
                      }}
                    >
                      {player.current_rating ? 'Update Rating' : 'Rate Player'}
                    </motion.button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Need {5 - player.games_played} more games to rate
                  </p>
                )}
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
