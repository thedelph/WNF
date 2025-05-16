import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, Info } from 'lucide-react';
import { useStats } from '../../hooks/useStats';
import { Tooltip } from '../ui/Tooltip';
import { TeamDistributionBar } from './TeamDistributionBar';
import { GoalsDistributionBar } from './GoalsDistributionBar';
import { GameResultsBar } from './GameResultsBar';

// Props interface for the ComprehensiveStatsTable component
interface ComprehensiveStatsTableProps {
  selectedYear: number | 'all';
}

// Define comprehensive player stats type
type ComprehensivePlayerStats = {
  id: string;
  friendlyName: string;
  caps: number;
  xp: number;
  winRate: number | null;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
  currentWinStreak: number;
  maxWinStreak: number;
  currentUnbeatenStreak: number;
  maxUnbeatenStreak: number;
  blueTeamPercentage: number | null;
  orangeTeamPercentage: number | null;
};

// Column definition for the stats table
interface Column {
  key: string;
  label: string | (() => string);
  tooltip?: string;
  sortable?: boolean;
  formatter?: (value: any, player?: ComprehensivePlayerStats) => React.ReactNode;
}

/**
 * ComprehensiveStatsTable - Displays a comprehensive table of player statistics
 * This component fetches data directly from the database to ensure all players are included
 * 
 * @param selectedYear - The currently selected year filter
 */
export const ComprehensiveStatsTable = ({ selectedYear }: ComprehensiveStatsTableProps) => {
  // State for search filter and sorting
  const [searchQuery, setSearchQuery] = useState('');
  // Keep a reference to valid stats to avoid losing them during re-renders
  const validStatsRef = useRef<ComprehensivePlayerStats[]>([]);
  const [sortColumn, setSortColumn] = useState('caps');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // For goals column, we'll track which specific metric to sort by (goalsFor or goalsAgainst)
  const [goalsSortMetric, setGoalsSortMetric] = useState<'goalsFor' | 'goalsAgainst'>('goalsFor');
  
  // Use the stats hook to get player statistics
  const { loading, error, comprehensiveStats, fetchComprehensivePlayerStats } = useStats();
  
  // Success callback for direct stats fetch
  const onComprehensiveStatsLoaded = useCallback((players: ComprehensivePlayerStats[]) => {
    if (players?.length) {
      console.log(`Successfully loaded ${players.length} players with XP data`);
      // Update our valid stats reference
      validStatsRef.current = players;
      
      // The filteredPlayers value will be automatically updated through the useMemo hook
      // since it depends on comprehensiveStats
    }
  }, [searchQuery]);

  // Fetch comprehensive player stats when the component mounts or year changes
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        console.log('Fetching comprehensive stats for year:', selectedYear);
        // Fetch data for the selected year
        const data = await fetchComprehensivePlayerStats(selectedYear);
        
        // Only update if component is still mounted
        if (isMounted && data && data.length > 0) {
          onComprehensiveStatsLoaded(data);
        }
      } catch (err) {
        console.error('Error loading comprehensive stats:', err);
      }
    };
    
    loadData();
    
    // Cleanup function to prevent additional updates after unmounting
    return () => {
      isMounted = false;
      console.log('Cleanup: ComprehensiveStatsTable effect for year', selectedYear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, onComprehensiveStatsLoaded]);
  
  // Log comprehensive stats when they're loaded
  useEffect(() => {
    if (comprehensiveStats?.length > 0) {
      console.log(`Comprehensive stats loaded: ${comprehensiveStats.length} players`);
      console.log('First 3 players XP values:', comprehensiveStats.slice(0, 3).map((p: ComprehensivePlayerStats) => ({ name: p.friendlyName, xp: p.xp })));
      
      // Store valid stats for future reference
      validStatsRef.current = comprehensiveStats;
    } else if (comprehensiveStats?.length === 0) {
      console.warn('Received empty comprehensive stats array');
      
      // If we have valid stats saved but received empty stats, don't update the UI
      if (validStatsRef.current.length > 0) {
        console.log(`Using ${validStatsRef.current.length} preserved valid stats instead of empty array`);
      }
    }
  }, [comprehensiveStats]);

  // Define the columns for our table
  const columns: Column[] = [
    { 
      key: 'friendlyName', 
      label: 'Player', 
      sortable: true 
    },
    { 
      key: 'xp', 
      label: 'XP', 
      sortable: true,
      tooltip: 'Experience points earned from playing games'
    },
    { 
      key: 'caps', 
      label: 'Caps', 
      sortable: true,
      tooltip: 'Total number of games played',
      formatter: (value) => {
        return value || 0;
      }
    },
    { 
      key: 'results', 
      label: 'Results', 
      sortable: true,
      tooltip: 'Distribution of known game results (W/L/D)',
      formatter: (_, player) => {
        if (!player) return 'N/A';
        
        return <GameResultsBar 
          wins={player.wins || 0}
          losses={player.losses || 0}
          draws={player.draws || 0}
        />;
      }
    },
    { 
      key: 'winRate', 
      label: 'Win %', 
      sortable: true,
      tooltip: 'Win percentage (wins / total games)',
      formatter: (value) => {
        if (value !== null && value !== undefined) {
          // Win rate is already stored as a percentage value (e.g., 43.3), so no need to multiply by 100
          // Just format it to one decimal place for consistent display
          return `${parseFloat(value.toString()).toFixed(1)}%`;
        }
        return '0.0%';
      }
    },
    { 
      key: 'goals', 
      label: () => {
        // Show different label based on the current goals sort metric and direction
        let metricLabel = 'Goals';
        if (sortColumn === 'goals') {
          // Create label based on which metric is being sorted
          const metricType = goalsSortMetric === 'goalsFor' ? 'GF' : 'GA';
          // Add sort direction indicator
          const directionIndicator = sortDirection === 'asc' ? '↑' : '↓';
          metricLabel = `Goals (${metricType} ${directionIndicator})`;
        }
        return metricLabel;
      }, 
      sortable: true, 
      tooltip: 'Click to cycle through sorting by: Goals For (GF) and Goals Against (GA)',
      formatter: (_, player) => {
        if (!player) return 'N/A';
        
        return <GoalsDistributionBar 
          goalsFor={player.goalsFor}
          goalsAgainst={player.goalsAgainst}
          goalDifferential={player.goalDifferential}
          mode="for-against"
        />;
      }
    },
    { 
      key: 'goalDifferential', 
      label: '+/-', 
      sortable: true, 
      tooltip: 'Goal Differential (Goals For - Goals Against)',
      formatter: (value) => {
        if (value === null || value === undefined) return 'N/A';
        const formattedValue = value > 0 ? `+${value}` : value;
        const colorClass = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
        return <span className={`font-semibold ${colorClass}`}>{formattedValue}</span>;
      }
    },
    { 
      key: 'currentWinStreak', 
      label: 'Current Win Streak', 
      sortable: true,
      tooltip: 'Current consecutive wins'
    },
    { 
      key: 'maxWinStreak', 
      label: 'Longest Win Streak', 
      sortable: true,
      tooltip: 'Longest consecutive win streak'
    },
    { 
      key: 'currentUnbeatenStreak', 
      label: 'Current Unbeaten', 
      sortable: true,
      tooltip: 'Current streak without losing (wins and draws)'
    },
    { 
      key: 'maxUnbeatenStreak', 
      label: 'Longest Unbeaten', 
      sortable: true,
      tooltip: 'Longest streak without losing (wins and draws)'
    },
    { 
      key: 'teamDistribution', 
      label: 'Team Colours', 
      sortable: true,
      tooltip: 'Distribution of games played on blue vs. orange team',
      // This formatter creates the visual team distribution bar
      formatter: (_, player) => {
        // Skip if player doesn't exist or hasn't played any games
        if (!player || player.caps === 0) return 'N/A';
        
        // Calculate percentages - ensure they add up to 100%
        let bluePercentage = player.blueTeamPercentage || 0;
        let orangePercentage = player.orangeTeamPercentage || 0;
        
        // If we have only one percentage, calculate the other to ensure they add up to 100%
        if (bluePercentage > 0 && orangePercentage === 0) {
          orangePercentage = 100 - bluePercentage;
        } else if (orangePercentage > 0 && bluePercentage === 0) {
          bluePercentage = 100 - orangePercentage;
        }
        
        // Return the visual distribution bar component
        return <TeamDistributionBar 
          bluePercentage={bluePercentage}
          orangePercentage={orangePercentage}
        />;
      }
    }
  ];

  // Filter players based on search query and minimum 10 caps requirement
  const filteredPlayers = useMemo(() => {
    // Basic search filtering - use valid stats if current stats are empty
    const statsToUse = comprehensiveStats?.length ? comprehensiveStats : validStatsRef.current;
    const searchFilter = searchQuery.toLowerCase() || '';
    
    // Only proceed with filtering if we have stats to filter
    if (!statsToUse || statsToUse.length === 0) {
      console.log('No stats available for filtering');
      return []; // Return empty array if no stats
    }
    
    const filtered = statsToUse.filter((player) => {
      // Check for minimum 10 games with known outcomes (wins + losses + draws)
      const knownOutcomes = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
      // Filter by name search and minimum 10 known outcomes requirement
      return player.friendlyName?.toLowerCase().includes(searchFilter) && knownOutcomes >= 10;
    });
    
    console.log(`After filtering: ${filtered.length} players remain (known outcomes >= 10 only)`);
    return filtered;
  }, [comprehensiveStats, searchQuery]);

  // Sort players based on current sort settings
  const sortedPlayers = useMemo(() => {
    if (!filteredPlayers.length) return [];
    
    // Debug log when sorting happens
    console.log(`Sorting ${filteredPlayers.length} players by ${sortColumn} ${sortDirection}`);
    
    const sortByTeamDistribution = (a: ComprehensivePlayerStats, b: ComprehensivePlayerStats) => {
      const aValue = a.blueTeamPercentage || 0;
      const bValue = b.blueTeamPercentage || 0;
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    };

    const sortByGoals = (a: ComprehensivePlayerStats, b: ComprehensivePlayerStats) => {
      if (goalsSortMetric === 'goalsFor') {
        const aValue = a.goalsFor || 0;
        const bValue = b.goalsFor || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      } else if (goalsSortMetric === 'goalsAgainst') {
        const aValue = a.goalsAgainst || 0;
        const bValue = b.goalsAgainst || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    };

    return [...filteredPlayers].sort((a, b) => {
      // Special handling for team distribution column (sort by blue team percentage)
      if (sortColumn === 'teamDistribution') {
        return sortByTeamDistribution(a, b);
      }
      
      // Special handling for goals column (using the current goals sort metric)
      if (sortColumn === 'goals') {
        return sortByGoals(a, b);
      }
      
      // Get the values to compare based on sort column
      const aValue: any = a[sortColumn as keyof ComprehensivePlayerStats];
      const bValue: any = b[sortColumn as keyof ComprehensivePlayerStats];
      
      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue === null) return sortDirection === 'asc' ? 1 : -1;
      
      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Number comparison
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [filteredPlayers, sortColumn, sortDirection, goalsSortMetric]);

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    console.log(`Sorting by ${column}`);
    
    // Special handling for goals column to cycle through all four combinations
    if (column === 'goals' && column === sortColumn) {
      // Cycle through: GF desc -> GF asc -> GA desc -> GA asc
      if (goalsSortMetric === 'goalsFor' && sortDirection === 'desc') {
        // GF desc -> GF asc
        setSortDirection('asc');
      } else if (goalsSortMetric === 'goalsFor' && sortDirection === 'asc') {
        // GF asc -> GA desc
        setGoalsSortMetric('goalsAgainst');
        setSortDirection('desc');
      } else if (goalsSortMetric === 'goalsAgainst' && sortDirection === 'desc') {
        // GA desc -> GA asc
        setSortDirection('asc');
      } else {
        // GA asc -> GF desc (back to the beginning)
        setGoalsSortMetric('goalsFor');
        setSortDirection('desc');
      }
    } else if (column === 'goals') {
      // If column is goals but wasn't the previous sort column
      setSortColumn(column);
      setGoalsSortMetric('goalsFor'); // Default to goalsFor
      setSortDirection('desc'); // Default to descending
    } else if (column === sortColumn) {
      // If same column (but not goals), toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Loading state - only show if we don't have any usable data
  const hasData = filteredPlayers.length > 0 || validStatsRef.current.length > 0;
  if (loading && !hasData) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
        <p className="ml-2">Loading player statistics...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="alert alert-error">
        <p>Error loading stats: {error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <h2 className="card-title text-2xl">Comprehensive Player Stats</h2>
        
        {/* Search filter */}
        <div className="my-4">
          <div className="input-group">
            <input
              type="text"
              placeholder="Search players..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-square">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Stats table */}
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className={column.sortable ? 'cursor-pointer hover:bg-base-200' : ''}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{typeof column.label === 'function' ? column.label() : column.label}</span>
                      {column.sortable && (
                        <ArrowUpDown className={`h-4 w-4 ${sortColumn === column.key ? 'text-primary' : 'opacity-50'}`} />
                      )}
                      {column.tooltip && (
                        <Tooltip content={column.tooltip}>
                          <Info className="h-4 w-4 text-info cursor-help" />
                        </Tooltip>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => (
                <tr key={player.id}>
                  {columns.map((column) => (
                    <td key={`${player.id}-${column.key}`}>
                      {/* Use formatter if available, otherwise display raw value */}
                      {column.formatter
                        ? column.formatter(player[column.key as keyof ComprehensivePlayerStats], player)
                        : column.key === 'xp' 
                          ? player.xp || 0 /* Ensure XP always shows a value */
                          : player[column.key as keyof ComprehensivePlayerStats] ?? 'N/A'
                      }
                    </td>
                  ))}
                </tr>
              ))}
              {sortedPlayers.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-4">
                    No players found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <p className="text-sm opacity-80 mt-4">
          Note: Stats are based on games with known outcomes. Players must have at least 10 games with known outcomes (wins/losses/draws) to be displayed.
          <strong> {sortedPlayers.length} players shown.</strong>
        </p>
      </div>
    </motion.div>
  );
};
