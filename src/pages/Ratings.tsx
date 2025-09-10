import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { formatStarRating, getRatingButtonText } from '../utils/ratingFormatters';
import RatingsExplanation from '../components/ratings/RatingsExplanation';
import PlaystyleSelector from '../components/ratings/PlaystyleSelector';
import { AttributeCombination, generatePlaystyleName, generatePlaystyleCompact } from '../types/playstyle';

interface Player {
  id: string;
  friendly_name: string;
  games_played: number;
  whatsapp_group_member: string;
  is_beta_tester?: boolean;
  is_super_admin?: boolean;
  current_rating?: {
    attack_rating: number;
    defense_rating: number;
    game_iq_rating: number;
    playstyle_id?: string | null;
    playstyles?: {
      id: string;
      name: string;
      category: string;
    } | null;
    // Individual attribute columns
    has_pace?: boolean | null;
    has_shooting?: boolean | null;
    has_passing?: boolean | null;
    has_dribbling?: boolean | null;
    has_defending?: boolean | null;
    has_physical?: boolean | null;
  };
}

type SortOption = 'alphabetical' | 'games_played' | 'rated' | 'unrated' | 'attack_asc' | 'attack_desc' | 'defense_asc' | 'defense_desc' | 'game_iq_asc' | 'game_iq_desc';
type FilterOption = 'all' | 'rated' | 'unrated' | 'min_games';

export default function Ratings() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('alphabetical');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [whatsAppMembersOnly, setWhatsAppMembersOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [ratings, setRatings] = useState<{ attack: number; defense: number; gameIq: number }>({
    attack: 0,
    defense: 0,
    gameIq: 0,
  });
  const [selectedAttributes, setSelectedAttributes] = useState<AttributeCombination | null>(null);
  const [availablePlaystyles, setAvailablePlaystyles] = useState<Array<{id: string; name: string; pace_weight: number; shooting_weight: number; passing_weight: number; dribbling_weight: number; defending_weight: number; physical_weight: number}>>([]);

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
    fetchCurrentPlayer();
    fetchPlaystyles();
  }, [user]);

  useEffect(() => {
    if (currentPlayer) {
      fetchPlayers();
    }
  }, [user, currentPlayer]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [players, sortOption, filterOption, whatsAppMembersOnly, searchQuery]);

  const applyFiltersAndSort = () => {
    let result = [...players];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(player => {
        if (player.friendly_name.toLowerCase().includes(query)) return true;
        if (player.current_rating?.playstyles?.name?.toLowerCase().includes(query)) return true;
        
        // Check generated playstyle name from attributes
        const rating = player.current_rating;
        if (rating && (rating.has_pace !== null || rating.has_shooting !== null || 
                      rating.has_passing !== null || rating.has_dribbling !== null || 
                      rating.has_defending !== null || rating.has_physical !== null)) {
          const attributes: AttributeCombination = {
            has_pace: rating.has_pace || false,
            has_shooting: rating.has_shooting || false,
            has_passing: rating.has_passing || false,
            has_dribbling: rating.has_dribbling || false,
            has_defending: rating.has_defending || false,
            has_physical: rating.has_physical || false,
          };
          const generatedName = generatePlaystyleName(attributes);
          if (generatedName.toLowerCase().includes(query)) return true;
        }
        
        return false;
      });
    }

    // Apply WhatsApp filter
    if (whatsAppMembersOnly) {
      result = result.filter(player => 
        player.whatsapp_group_member === 'Yes' || 
        player.whatsapp_group_member === 'Proxy'
      );
    }

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
      case 'has_playstyle':
        result = result.filter(player => {
          const rating = player.current_rating;
          // Support both old and new systems
          return rating && (rating.playstyle_id || 
                           (rating.has_pace || rating.has_shooting || rating.has_passing || 
                            rating.has_dribbling || rating.has_defending || rating.has_physical));
        });
        break;
      case 'no_playstyle':
        result = result.filter(player => {
          const rating = player.current_rating;
          return rating && !rating.playstyle_id && 
                 !(rating.has_pace || rating.has_shooting || rating.has_passing || 
                   rating.has_dribbling || rating.has_defending || rating.has_physical);
        });
        break;
      case 'attacking_style':
        result = result.filter(player => {
          const rating = player.current_rating;
          return rating && (rating.playstyles?.category === 'attacking' ||
                           (rating.has_pace || rating.has_shooting || rating.has_dribbling));
        });
        break;
      case 'midfield_style':
        result = result.filter(player => {
          const rating = player.current_rating;
          return rating && (rating.playstyles?.category === 'midfield' ||
                           (rating.has_passing || rating.has_dribbling));
        });
        break;
      case 'defensive_style':
        result = result.filter(player => {
          const rating = player.current_rating;
          return rating && (rating.playstyles?.category === 'defensive' ||
                           (rating.has_defending || rating.has_physical));
        });
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
      case 'game_iq_asc':
        result.sort((a, b) => {
          if (!a.current_rating) return 1;
          if (!b.current_rating) return -1;
          return (a.current_rating.game_iq_rating || 0) - (b.current_rating.game_iq_rating || 0);
        });
        break;
      case 'game_iq_desc':
        result.sort((a, b) => {
          if (!a.current_rating) return 1;
          if (!b.current_rating) return -1;
          return (b.current_rating.game_iq_rating || 0) - (a.current_rating.game_iq_rating || 0);
        });
        break;
      case 'playstyle_name':
        result.sort((a, b) => {
          // Get playstyle name for a
          let aName = 'zzz';
          if (a.current_rating?.playstyles?.name) {
            aName = a.current_rating.playstyles.name;
          } else if (a.current_rating && (a.current_rating.has_pace !== null || a.current_rating.has_shooting !== null || 
                                         a.current_rating.has_passing !== null || a.current_rating.has_dribbling !== null || 
                                         a.current_rating.has_defending !== null || a.current_rating.has_physical !== null)) {
            const attributes: AttributeCombination = {
              has_pace: a.current_rating.has_pace || false,
              has_shooting: a.current_rating.has_shooting || false,
              has_passing: a.current_rating.has_passing || false,
              has_dribbling: a.current_rating.has_dribbling || false,
              has_defending: a.current_rating.has_defending || false,
              has_physical: a.current_rating.has_physical || false,
            };
            aName = generatePlaystyleName(attributes);
          }
          
          // Get playstyle name for b
          let bName = 'zzz';
          if (b.current_rating?.playstyles?.name) {
            bName = b.current_rating.playstyles.name;
          } else if (b.current_rating && (b.current_rating.has_pace !== null || b.current_rating.has_shooting !== null || 
                                         b.current_rating.has_passing !== null || b.current_rating.has_dribbling !== null || 
                                         b.current_rating.has_defending !== null || b.current_rating.has_physical !== null)) {
            const attributes: AttributeCombination = {
              has_pace: b.current_rating.has_pace || false,
              has_shooting: b.current_rating.has_shooting || false,
              has_passing: b.current_rating.has_passing || false,
              has_dribbling: b.current_rating.has_dribbling || false,
              has_defending: b.current_rating.has_defending || false,
              has_physical: b.current_rating.has_physical || false,
            };
            bName = generatePlaystyleName(attributes);
          }
          
          return aName.localeCompare(bName);
        });
        break;
      case 'playstyle_category':
        result.sort((a, b) => {
          // Sort by primary attribute type: attacking (pace/shooting), midfield (passing/dribbling), defensive (defending/physical)
          const getCategory = (rating: any) => {
            if (!rating) return 3;
            // Check old system first
            if (rating.playstyles?.category === 'attacking') return 0;
            if (rating.playstyles?.category === 'midfield') return 1;
            if (rating.playstyles?.category === 'defensive') return 2;
            // Check new system
            if (rating.has_defending || rating.has_physical) return 2; // Defensive
            if (rating.has_passing || rating.has_dribbling) return 1;  // Midfield
            if (rating.has_pace || rating.has_shooting) return 0;      // Attacking
            return 3; // No attributes
          };
          return getCategory(a.current_rating) - getCategory(b.current_rating);
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
        .select('id, friendly_name, is_beta_tester, is_super_admin')
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
          current_player_id: currentPlayer.id
        });

      if (error) throw error;

      // Get current user's ratings with playstyle information
      // Since the new columns might not exist yet, we'll handle both old and new schemas
      const { data: existingRatings, error: ratingsError } = await supabase
        .from('player_ratings')
        .select(`
          rated_player_id, 
          attack_rating, 
          defense_rating, 
          game_iq_rating,
          playstyle_id,
          has_pace,
          has_shooting,
          has_passing,
          has_dribbling,
          has_defending,
          has_physical,
          playstyles (
            id,
            name,
            category
          )
        `)
        .eq('rater_id', currentPlayer.id);
      
      if (ratingsError) {
        console.error('Error fetching ratings:', ratingsError);
      }

      // Get WhatsApp status for all players
      const { data: whatsAppData, error: whatsAppError } = await supabase
        .from('players')
        .select('id, whatsapp_group_member');

      if (whatsAppError) throw whatsAppError;

      // Create a map for WhatsApp status
      const whatsAppStatusMap = new Map(
        whatsAppData?.map(player => [player.id, player.whatsapp_group_member])
      );

      // Combine the data and filter out the current user
      const enhancedPlayers = playersWithGames
        .filter((player: any) => player.id !== currentPlayer.id)
        .map((player: any) => ({
          ...player,
          whatsapp_group_member: whatsAppStatusMap.get(player.id) || null,
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
      const ratingData: any = {
        rater_id: currentPlayer.id,
        rated_player_id: selectedPlayer.id,
        attack_rating: ratings.attack,
        defense_rating: ratings.defense,
        game_iq_rating: ratings.gameIq,
      };

      // Save attributes directly to database columns
      if ((currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && selectedAttributes) {
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
      } else if ((currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin)) {
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

      toast.success(`Successfully rated ${selectedPlayer.friendly_name}`);
      setSelectedPlayer(null);
      setSelectedAttributes(null); // Reset attribute selection
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
      <h1 className="text-3xl font-bold mb-4">Player Ratings</h1>
      
      <RatingsExplanation />
      
      {/* Advanced Filters Section */}
      <div className="mb-6">
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>{isFiltersOpen ? '−' : '+'}</span>
          Sorting & Filtering Options
        </button>
        
        <AnimatePresence>
          {isFiltersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 bg-white rounded-lg shadow-md space-y-4">
                {/* Search Input */}
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Search Players</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or playstyle..."
                    className="w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                {/* Sort and Filter Controls */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium mb-2">Sort By</label>
                    <select
                      className="w-full p-2 border rounded-md bg-white"
                      value={sortOption}
                      onChange={(e) => {
                        if (
                          filterOption === 'unrated' && 
                          (e.target.value.includes('attack') || e.target.value.includes('defense') || e.target.value.includes('game_iq'))
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
                          <option value="game_iq_asc">Game IQ Rating (Low to High)</option>
                          <option value="game_iq_desc">Game IQ Rating (High to Low)</option>
                        </>
                      )}
                      {(currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && filterOption !== 'unrated' && (
                        <>
                          <option value="playstyle_name">Playstyle (A-Z)</option>
                          <option value="playstyle_category">Playstyle Category</option>
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
                        if (
                          newFilter === 'unrated' && 
                          (sortOption.includes('attack') || sortOption.includes('defense') || sortOption.includes('game_iq'))
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
                      {(currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && (
                        <>
                          <option value="has_playstyle">Has Playstyle</option>
                          <option value="no_playstyle">No Playstyle</option>
                          <option value="attacking_style">Attacking Styles</option>
                          <option value="midfield_style">Midfield Styles</option>
                          <option value="defensive_style">Defensive Styles</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* WhatsApp Members Only Filter */}
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="whatsAppMembersOnly"
                    checked={whatsAppMembersOnly}
                    onChange={(e) => setWhatsAppMembersOnly(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <label htmlFor="whatsAppMembersOnly" className="text-sm font-medium text-gray-700">
                    WhatsApp Members Only
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
            className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full space-y-4 relative z-50 max-h-[90vh] overflow-y-auto"
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
              <StarRating
                rating={ratings.gameIq}
                onChange={(value) => setRatings(prev => ({ ...prev, gameIq: value }))}
                label="Game IQ Rating"
              />
              {(currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && (
                <PlaystyleSelector
                  selectedAttributes={selectedAttributes}
                  onAttributesChange={setSelectedAttributes}
                />
              )}
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
                className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2"
                onClick={handleRatingSubmit}
              >
                <span className="inline-flex items-center justify-center w-4 h-4">⭐</span>
                <span className="font-medium">SUBMIT RATING</span>
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
                        <p>Attack: {formatStarRating(player.current_rating.attack_rating)}</p>
                        <p>Defense: {formatStarRating(player.current_rating.defense_rating)}</p>
                        <p>Game IQ: {formatStarRating(player.current_rating.game_iq_rating)}</p>
                        {(currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && (() => {
                          const rating = player.current_rating;
                          // Generate playstyle name from attributes
                          let playstyleName = '';
                          
                          if (rating?.playstyles?.name) {
                            // Use database playstyle name if available
                            playstyleName = rating.playstyles.name;
                          } else if (rating && (rating.has_pace !== null || rating.has_shooting !== null || 
                                              rating.has_passing !== null || rating.has_dribbling !== null || 
                                              rating.has_defending !== null || rating.has_physical !== null)) {
                            // Generate from individual attributes
                            const attributes: AttributeCombination = {
                              has_pace: rating.has_pace || false,
                              has_shooting: rating.has_shooting || false,
                              has_passing: rating.has_passing || false,
                              has_dribbling: rating.has_dribbling || false,
                              has_defending: rating.has_defending || false,
                              has_physical: rating.has_physical || false,
                            };
                            playstyleName = generatePlaystyleName(attributes);
                          }
                          
                          return playstyleName && playstyleName !== 'No Style Selected' ? (
                            <div className="mt-2">
                              <p className="font-semibold text-xs">Playstyle:</p>
                              <div className="mt-1">
                                <span className="text-xs font-medium text-primary">
                                  {playstyleName}
                                </span>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2"
                      onClick={() => {
                        setSelectedPlayer(player);
                        setRatings({
                          attack: player.current_rating?.attack_rating || 0,
                          defense: player.current_rating?.defense_rating || 0,
                          gameIq: player.current_rating?.game_iq_rating || 0
                        });
                        // Set selected attributes from current rating
                        const rating = player.current_rating;
                        
                        // Check if using individual attribute columns (prioritize these)
                        if (rating && (rating.has_pace !== null || rating.has_shooting !== null || rating.has_passing !== null || 
                                     rating.has_dribbling !== null || rating.has_defending !== null || rating.has_physical !== null)) {
                          setSelectedAttributes({
                            has_pace: rating.has_pace || false,
                            has_shooting: rating.has_shooting || false,
                            has_passing: rating.has_passing || false,
                            has_dribbling: rating.has_dribbling || false,
                            has_defending: rating.has_defending || false,
                            has_physical: rating.has_physical || false,
                          });
                        } 
                        // Convert from old playstyle system as fallback
                        else if (rating?.playstyles) {
                          // Map old playstyle to attributes based on the playstyle definitions
                          const playstyleToAttributes: Record<string, AttributeCombination> = {
                            'All-Rounder': { has_pace: true, has_shooting: true, has_passing: true, has_dribbling: true, has_defending: true, has_physical: true },
                            'Hunter': { has_pace: true, has_shooting: true, has_passing: false, has_dribbling: false, has_defending: false, has_physical: false },
                            'Hawk': { has_pace: true, has_shooting: true, has_passing: false, has_dribbling: false, has_defending: false, has_physical: true },
                            'Marksman': { has_pace: false, has_shooting: true, has_passing: false, has_dribbling: true, has_defending: false, has_physical: true },
                            'Finisher': { has_pace: false, has_shooting: true, has_passing: false, has_dribbling: false, has_defending: false, has_physical: true },
                            'Sniper': { has_pace: false, has_shooting: true, has_passing: false, has_dribbling: true, has_defending: false, has_physical: false },
                            'Deadeye': { has_pace: false, has_shooting: true, has_passing: true, has_dribbling: false, has_defending: false, has_physical: false },
                            'Speedster': { has_pace: true, has_shooting: false, has_passing: false, has_dribbling: true, has_defending: false, has_physical: false },
                            'Engine': { has_pace: true, has_shooting: false, has_passing: true, has_dribbling: true, has_defending: false, has_physical: false },
                            'Artist': { has_pace: false, has_shooting: false, has_passing: true, has_dribbling: true, has_defending: false, has_physical: false },
                            'Architect': { has_pace: false, has_shooting: false, has_passing: true, has_dribbling: false, has_defending: false, has_physical: true },
                            'Powerhouse': { has_pace: false, has_shooting: false, has_passing: true, has_dribbling: false, has_defending: true, has_physical: false },
                            'Maestro': { has_pace: false, has_shooting: true, has_passing: true, has_dribbling: true, has_defending: false, has_physical: false },
                            'Catalyst': { has_pace: true, has_shooting: false, has_passing: true, has_dribbling: false, has_defending: false, has_physical: false },
                            'Locomotive': { has_pace: true, has_shooting: false, has_passing: false, has_dribbling: false, has_defending: false, has_physical: true },
                            'Enforcer': { has_pace: false, has_shooting: false, has_passing: false, has_dribbling: true, has_defending: false, has_physical: true },
                            'Shadow': { has_pace: true, has_shooting: false, has_passing: false, has_dribbling: false, has_defending: true, has_physical: false },
                            'Anchor': { has_pace: true, has_shooting: false, has_passing: false, has_dribbling: false, has_defending: true, has_physical: true },
                            'Gladiator': { has_pace: false, has_shooting: true, has_passing: false, has_dribbling: false, has_defending: true, has_physical: false },
                            'Guardian': { has_pace: false, has_shooting: false, has_passing: false, has_dribbling: true, has_defending: true, has_physical: false },
                            'Sentinel': { has_pace: false, has_shooting: false, has_passing: false, has_dribbling: false, has_defending: true, has_physical: true },
                            'Backbone': { has_pace: false, has_shooting: false, has_passing: true, has_dribbling: false, has_defending: true, has_physical: true }
                          };
                          
                          const playstyleName = rating.playstyles.name;
                          const attributes = playstyleToAttributes[playstyleName];
                          
                          if (attributes) {
                            setSelectedAttributes(attributes);
                          } else {
                            setSelectedAttributes(null);
                          }
                        } else {
                          setSelectedAttributes(null);
                        }
                      }}
                    >
                      <span className="inline-flex items-center justify-center w-4 h-4">⭐</span>
                      <span className="font-medium">{getRatingButtonText(player.current_rating)}</span>
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
