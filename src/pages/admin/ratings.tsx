import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../../hooks/useAdmin';
import { supabase } from '../../utils/supabase';
import { FaSortAmountDown, FaSortAmountUp, FaFilter, FaTimes, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface Rating {
  id: string;
  attack_rating: number;
  defense_rating: number;
  created_at: string;
  rater: { friendly_name: string };
  rated_player: { friendly_name: string };
}

interface Player {
  id: string;
  friendly_name: string;
  average_attack: number;
  average_defense: number;
  total_ratings: number;
}

interface SortConfig {
  key: 'friendly_name' | 'average_attack' | 'average_defense' | 'total_ratings' | 'ratings_given';
  direction: 'asc' | 'desc';
}

interface RatingsSortConfig {
  key: 'friendly_name' | 'attack' | 'defense' | 'created_at';
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  minAttack: number;
  maxAttack: number;
  minDefense: number;
  maxDefense: number;
  minTotalRatings: number;
}

const RatingsView: React.FC = () => {
  const { isSuperAdmin } = useAdmin();
  const [players, setPlayers] = useState<Player[]>([]);
  const [raters, setRaters] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedRater, setSelectedRater] = useState<string | null>(null);
  const [playerRatings, setPlayerRatings] = useState<Rating[]>([]);
  const [raterRatings, setRaterRatings] = useState<Rating[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [raterSearchTerm, setRaterSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'friendly_name',
    direction: 'asc'
  });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    minAttack: 0,
    maxAttack: 10,
    minDefense: 0,
    maxDefense: 10,
    minTotalRatings: 0
  });
  const [raterSortConfig, setRaterSortConfig] = useState<SortConfig>({
    key: 'friendly_name',
    direction: 'asc'
  });
  const [expandedRatingsSortConfig, setExpandedRatingsSortConfig] = useState<RatingsSortConfig>({
    key: 'friendly_name',
    direction: 'asc'
  });
  const [expandedRaterRatingsSortConfig, setExpandedRaterRatingsSortConfig] = useState<RatingsSortConfig>({
    key: 'friendly_name',
    direction: 'asc'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Unauthorized access');
      return;
    }
    fetchPlayers();
    fetchRaters();
  }, [isSuperAdmin]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .select(`
          rated_player_id,
          rated_player:players!player_ratings_rated_player_id_fkey(
            id,
            friendly_name
          ),
          attack_rating,
          defense_rating
        `)
        .not('rated_player_id', 'is', null);

      if (error) throw error;

      // Calculate averages and group by player
      const playerMap = new Map<string, { 
        id: string;
        friendly_name: string;
        total_ratings: number;
        total_attack: number;
        total_defense: number;
      }>();

      data.forEach(rating => {
        const playerId = rating.rated_player_id;
        const current = playerMap.get(playerId) || {
          id: playerId,
          friendly_name: rating.rated_player.friendly_name,
          total_ratings: 0,
          total_attack: 0,
          total_defense: 0
        };

        current.total_ratings++;
        current.total_attack += rating.attack_rating;
        current.total_defense += rating.defense_rating;
        playerMap.set(playerId, current);
      });

      const processedPlayers = Array.from(playerMap.values()).map(player => ({
        id: player.id,
        friendly_name: player.friendly_name,
        average_attack: Number((player.total_attack / player.total_ratings).toFixed(1)),
        average_defense: Number((player.total_defense / player.total_ratings).toFixed(1)),
        total_ratings: player.total_ratings
      }));

      setPlayers(processedPlayers);
    } catch (error) {
      toast.error('Error fetching players');
      console.error('Error:', error);
    }
  };

  const fetchRaters = async () => {
    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .select(`
          rater_id,
          rater:players!player_ratings_rater_id_fkey(
            id,
            friendly_name
          ),
          attack_rating,
          defense_rating
        `)
        .not('rater_id', 'is', null);

      if (error) throw error;

      // Group by rater
      const raterMap = new Map<string, {
        id: string;
        friendly_name: string;
        total_ratings: number;
      }>();

      data.forEach(rating => {
        const raterId = rating.rater_id;
        const current = raterMap.get(raterId) || {
          id: raterId,
          friendly_name: rating.rater.friendly_name,
          total_ratings: 0
        };

        current.total_ratings++;
        raterMap.set(raterId, current);
      });

      const processedRaters = Array.from(raterMap.values());
      setRaters(processedRaters);
    } catch (error) {
      toast.error('Error fetching raters');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerRatings = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .select(`
          id,
          attack_rating,
          defense_rating,
          created_at,
          rater:players!player_ratings_rater_id_fkey(friendly_name),
          rated_player:players!player_ratings_rated_player_id_fkey(friendly_name)
        `)
        .eq('rated_player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlayerRatings(data);
    } catch (error) {
      toast.error('Error fetching player ratings');
      console.error('Error:', error);
    }
  };

  const fetchRaterRatings = async (raterId: string) => {
    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .select(`
          id,
          attack_rating,
          defense_rating,
          created_at,
          rater:players!player_ratings_rater_id_fkey(friendly_name),
          rated_player:players!player_ratings_rated_player_id_fkey(friendly_name)
        `)
        .eq('rater_id', raterId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRaterRatings(data);
    } catch (error) {
      toast.error('Error fetching rater ratings');
      console.error('Error:', error);
    }
  };

  const handlePlayerClick = (playerId: string) => {
    if (selectedPlayer === playerId) {
      setSelectedPlayer(null);
      setPlayerRatings([]);
    } else {
      setSelectedPlayer(playerId);
      fetchPlayerRatings(playerId);
    }
  };

  const handleRaterClick = (raterId: string) => {
    if (selectedRater === raterId) {
      setSelectedRater(null);
      setRaterRatings([]);
    } else {
      setSelectedRater(raterId);
      fetchRaterRatings(raterId);
    }
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleRaterSort = (key: SortConfig['key']) => {
    setRaterSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExpandedRatingsSort = (key: RatingsSortConfig['key']) => {
    setExpandedRatingsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExpandedRaterRatingsSort = (key: RatingsSortConfig['key']) => {
    setExpandedRaterRatingsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortRatings = (ratings: Rating[]) => {
    return [...ratings].sort((a, b) => {
      const multiplier = expandedRatingsSortConfig.direction === 'asc' ? 1 : -1;
      
      switch (expandedRatingsSortConfig.key) {
        case 'friendly_name':
          return (a.rater.friendly_name || '').localeCompare(b.rater.friendly_name || '') * multiplier;
        case 'attack':
          return (a.attack_rating - b.attack_rating) * multiplier;
        case 'defense':
          return (a.defense_rating - b.defense_rating) * multiplier;
        case 'created_at':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier;
        default:
          return 0;
      }
    });
  };

  const sortRaterRatings = (ratings: Rating[]) => {
    return [...ratings].sort((a, b) => {
      const multiplier = expandedRaterRatingsSortConfig.direction === 'asc' ? 1 : -1;
      
      switch (expandedRaterRatingsSortConfig.key) {
        case 'friendly_name':
          return (a.rated_player.friendly_name || '').localeCompare(b.rated_player.friendly_name || '') * multiplier;
        case 'attack':
          return (a.attack_rating - b.attack_rating) * multiplier;
        case 'defense':
          return (a.defense_rating - b.defense_rating) * multiplier;
        case 'created_at':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier;
        default:
          return 0;
      }
    });
  };

  const filteredAndSortedPlayers = players
    .filter(player => {
      const matchesSearch = player.friendly_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const meetsFilters = 
        player.average_attack >= filterConfig.minAttack &&
        player.average_attack <= filterConfig.maxAttack &&
        player.average_defense >= filterConfig.minDefense &&
        player.average_defense <= filterConfig.maxDefense &&
        player.total_ratings >= filterConfig.minTotalRatings;

      return matchesSearch && meetsFilters;
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * multiplier;
      }
      
      return String(aValue).localeCompare(String(bValue)) * multiplier;
    });

  const filteredAndSortedRaters = raters
    .filter(rater => {
      const matchesSearch = rater.friendly_name
        .toLowerCase()
        .includes(raterSearchTerm.toLowerCase());

      return matchesSearch;
    })
    .sort((a, b) => {
      const multiplier = raterSortConfig.direction === 'asc' ? 1 : -1;
      
      if (raterSortConfig.key === 'friendly_name') {
        return a.friendly_name.localeCompare(b.friendly_name) * multiplier;
      } else if (raterSortConfig.key === 'ratings_given') {
        return (a.total_ratings - b.total_ratings) * multiplier;
      }
      
      return 0;
    });

  if (!isSuperAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto p-4 space-y-8"
    >
      <h1 className="text-3xl font-bold mb-6">Player Ratings Management</h1>

      {/* Players who have been rated */}
      <div className="bg-base-200 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Rated Players</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search players..."
                className="input input-bordered pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className="btn btn-ghost gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter />
              Filters
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-base-300 p-4 rounded-lg mb-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">Attack Rating Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      className="input input-bordered w-20"
                      value={filterConfig.minAttack}
                      onChange={(e) => setFilterConfig(prev => ({
                        ...prev,
                        minAttack: Number(e.target.value)
                      }))}
                    />
                    <span className="self-center">to</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      className="input input-bordered w-20"
                      value={filterConfig.maxAttack}
                      onChange={(e) => setFilterConfig(prev => ({
                        ...prev,
                        maxAttack: Number(e.target.value)
                      }))}
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">Defense Rating Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      className="input input-bordered w-20"
                      value={filterConfig.minDefense}
                      onChange={(e) => setFilterConfig(prev => ({
                        ...prev,
                        minDefense: Number(e.target.value)
                      }))}
                    />
                    <span className="self-center">to</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      className="input input-bordered w-20"
                      value={filterConfig.maxDefense}
                      onChange={(e) => setFilterConfig(prev => ({
                        ...prev,
                        maxDefense: Number(e.target.value)
                      }))}
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">Minimum Total Ratings</label>
                  <input
                    type="number"
                    min="0"
                    className="input input-bordered w-full"
                    value={filterConfig.minTotalRatings}
                    onChange={(e) => setFilterConfig(prev => ({
                      ...prev,
                      minTotalRatings: Number(e.target.value)
                    }))}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th 
                  onClick={() => handleSort('friendly_name')} 
                  className="cursor-pointer hover:bg-base-300"
                >
                  Player
                  {sortConfig.key === 'friendly_name' && (
                    sortConfig.direction === 'asc' ? 
                      <FaSortAmountUp className="inline ml-2" /> : 
                      <FaSortAmountDown className="inline ml-2" />
                  )}
                </th>
                <th 
                  onClick={() => handleSort('average_attack')} 
                  className="cursor-pointer hover:bg-base-300"
                >
                  Average Attack
                  {sortConfig.key === 'average_attack' && (
                    sortConfig.direction === 'asc' ? 
                      <FaSortAmountUp className="inline ml-2" /> : 
                      <FaSortAmountDown className="inline ml-2" />
                  )}
                </th>
                <th 
                  onClick={() => handleSort('average_defense')} 
                  className="cursor-pointer hover:bg-base-300"
                >
                  Average Defense
                  {sortConfig.key === 'average_defense' && (
                    sortConfig.direction === 'asc' ? 
                      <FaSortAmountUp className="inline ml-2" /> : 
                      <FaSortAmountDown className="inline ml-2" />
                  )}
                </th>
                <th 
                  onClick={() => handleSort('total_ratings')} 
                  className="cursor-pointer hover:bg-base-300"
                >
                  Total Ratings
                  {sortConfig.key === 'total_ratings' && (
                    sortConfig.direction === 'asc' ? 
                      <FaSortAmountUp className="inline ml-2" /> : 
                      <FaSortAmountDown className="inline ml-2" />
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPlayers.map((player) => (
                <React.Fragment key={player.id}>
                  <tr
                    className={`hover:bg-base-300 cursor-pointer ${
                      selectedPlayer === player.id ? 'bg-base-300' : ''
                    }`}
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <td>{player.friendly_name}</td>
                    <td>{player.average_attack}</td>
                    <td>{player.average_defense}</td>
                    <td>{player.total_ratings}</td>
                  </tr>
                  {selectedPlayer === player.id && (
                    <tr>
                      <td colSpan={4}>
                        <div className="p-4 bg-base-100 rounded-lg mt-2">
                          <h3 className="text-lg font-semibold mb-4">Rating Details</h3>
                          <div className="overflow-x-auto">
                            <table className="table w-full">
                              <thead>
                                <tr>
                                  <th 
                                    onClick={() => handleExpandedRatingsSort('friendly_name')}
                                    className="cursor-pointer hover:bg-base-300"
                                  >
                                    Rated By
                                    {expandedRatingsSortConfig.key === 'friendly_name' && (
                                      expandedRatingsSortConfig.direction === 'asc' ? 
                                        <FaSortAmountUp className="inline ml-2" /> : 
                                        <FaSortAmountDown className="inline ml-2" />
                                    )}
                                  </th>
                                  <th 
                                    onClick={() => handleExpandedRatingsSort('attack')}
                                    className="cursor-pointer hover:bg-base-300"
                                  >
                                    Attack
                                    {expandedRatingsSortConfig.key === 'attack' && (
                                      expandedRatingsSortConfig.direction === 'asc' ? 
                                        <FaSortAmountUp className="inline ml-2" /> : 
                                        <FaSortAmountDown className="inline ml-2" />
                                    )}
                                  </th>
                                  <th 
                                    onClick={() => handleExpandedRatingsSort('defense')}
                                    className="cursor-pointer hover:bg-base-300"
                                  >
                                    Defense
                                    {expandedRatingsSortConfig.key === 'defense' && (
                                      expandedRatingsSortConfig.direction === 'asc' ? 
                                        <FaSortAmountUp className="inline ml-2" /> : 
                                        <FaSortAmountDown className="inline ml-2" />
                                    )}
                                  </th>
                                  <th 
                                    onClick={() => handleExpandedRatingsSort('created_at')}
                                    className="cursor-pointer hover:bg-base-300"
                                  >
                                    Date
                                    {expandedRatingsSortConfig.key === 'created_at' && (
                                      expandedRatingsSortConfig.direction === 'asc' ? 
                                        <FaSortAmountUp className="inline ml-2" /> : 
                                        <FaSortAmountDown className="inline ml-2" />
                                    )}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortRatings(playerRatings).map((rating) => (
                                  <tr key={rating.id}>
                                    <td>{rating.rater.friendly_name}</td>
                                    <td>{rating.attack_rating}</td>
                                    <td>{rating.defense_rating}</td>
                                    <td>{new Date(rating.created_at).toLocaleDateString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Players who have given ratings */}
      <div className="bg-base-200 p-6 rounded-lg mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Raters</h2>
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search raters..."
              className="input input-bordered pl-10"
              value={raterSearchTerm}
              onChange={(e) => setRaterSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th 
                  onClick={() => handleRaterSort('friendly_name')} 
                  className="cursor-pointer hover:bg-base-300"
                >
                  Rater
                  {raterSortConfig.key === 'friendly_name' && (
                    raterSortConfig.direction === 'asc' ? 
                      <FaSortAmountUp className="inline ml-2" /> : 
                      <FaSortAmountDown className="inline ml-2" />
                  )}
                </th>
                <th 
                  onClick={() => handleRaterSort('ratings_given')} 
                  className="cursor-pointer hover:bg-base-300"
                >
                  Total Ratings Given
                  {raterSortConfig.key === 'ratings_given' && (
                    raterSortConfig.direction === 'asc' ? 
                      <FaSortAmountUp className="inline ml-2" /> : 
                      <FaSortAmountDown className="inline ml-2" />
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRaters.map((rater) => (
                <React.Fragment key={rater.id}>
                  <tr
                    className={`hover:bg-base-300 cursor-pointer ${
                      selectedRater === rater.id ? 'bg-base-300' : ''
                    }`}
                    onClick={() => handleRaterClick(rater.id)}
                  >
                    <td>{rater.friendly_name}</td>
                    <td>{rater.total_ratings}</td>
                  </tr>
                  {selectedRater === rater.id && (
                    <tr>
                      <td colSpan={2}>
                        <div className="p-4 bg-base-100 rounded-lg mt-2">
                          <h3 className="text-lg font-semibold mb-4">Rating Details</h3>
                          <div className="overflow-x-auto">
                            <table className="table w-full">
                              <thead>
                                <tr>
                                  <th 
                                    onClick={() => handleExpandedRaterRatingsSort('friendly_name')}
                                    className="cursor-pointer hover:bg-base-300"
                                  >
                                    Rated Player
                                    {expandedRaterRatingsSortConfig.key === 'friendly_name' && (
                                      expandedRaterRatingsSortConfig.direction === 'asc' ? 
                                        <FaSortAmountUp className="inline ml-2" /> : 
                                        <FaSortAmountDown className="inline ml-2" />
                                    )}
                                  </th>
                                  <th 
                                    onClick={() => handleExpandedRaterRatingsSort('attack')}
                                    className="cursor-pointer hover:bg-base-300"
                                  >
                                    Attack
                                    {expandedRaterRatingsSortConfig.key === 'attack' && (
                                      expandedRaterRatingsSortConfig.direction === 'asc' ? 
                                        <FaSortAmountUp className="inline ml-2" /> : 
                                        <FaSortAmountDown className="inline ml-2" />
                                    )}
                                  </th>
                                  <th 
                                    onClick={() => handleExpandedRaterRatingsSort('defense')}
                                    className="cursor-pointer hover:bg-base-300"
                                  >
                                    Defense
                                    {expandedRaterRatingsSortConfig.key === 'defense' && (
                                      expandedRaterRatingsSortConfig.direction === 'asc' ? 
                                        <FaSortAmountUp className="inline ml-2" /> : 
                                        <FaSortAmountDown className="inline ml-2" />
                                    )}
                                  </th>
                                  <th 
                                    onClick={() => handleExpandedRaterRatingsSort('created_at')}
                                    className="cursor-pointer hover:bg-base-300"
                                  >
                                    Date
                                    {expandedRaterRatingsSortConfig.key === 'created_at' && (
                                      expandedRaterRatingsSortConfig.direction === 'asc' ? 
                                        <FaSortAmountUp className="inline ml-2" /> : 
                                        <FaSortAmountDown className="inline ml-2" />
                                    )}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortRaterRatings(raterRatings).map((rating) => (
                                  <tr key={rating.id}>
                                    <td>{rating.rated_player.friendly_name}</td>
                                    <td>{rating.attack_rating}</td>
                                    <td>{rating.defense_rating}</td>
                                    <td>{new Date(rating.created_at).toLocaleDateString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default RatingsView;
