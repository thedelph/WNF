import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, Info, ChevronDown, ChevronRight, ArrowDown, ArrowUp, Filter } from 'lucide-react';
import { useStats } from '../../hooks/useStats';
import { Tooltip } from '../ui/Tooltip';
import { TeamDistributionBar } from './TeamDistributionBar';
import { GoalsDistributionBar } from './GoalsDistributionBar';
import { GameResultsBar } from './GameResultsBar';
import { StreakBar } from './StreakBar';

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
  
  // Track maximum streak values across all players for relative scaling
  const [maxWinStreakValue, setMaxWinStreakValue] = useState(0);
  const [maxUnbeatenStreakValue, setMaxUnbeatenStreakValue] = useState(0);
  
  // State for mobile view - track expanded player cards
  const [expandedPlayers, setExpandedPlayers] = useState<{[key: string]: boolean}>({});
  
  // State to track if we're in mobile view
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Effect to detect mobile view using window size
  useEffect(() => {
    // Function to check if we're in mobile view
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768); // Standard md breakpoint
    };
    
    // Check on initial load
    checkMobileView();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    // Cleanup on unmount
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);
  
  // Toggle expanded state for a player
  const togglePlayerExpanded = (playerId: string) => {
    setExpandedPlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };
  
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
      
      // Calculate maximum streak values for visual scaling
      let maxWin = 0;
      let maxUnbeaten = 0;
      
      comprehensiveStats.forEach((player) => {
        if (player.maxWinStreak > maxWin) maxWin = player.maxWinStreak;
        if (player.maxUnbeatenStreak > maxUnbeaten) maxUnbeaten = player.maxUnbeatenStreak;
      });
      
      setMaxWinStreakValue(maxWin);
      setMaxUnbeatenStreakValue(maxUnbeaten);
      
      console.log(`Max win streak across all players: ${maxWin}`);
      console.log(`Max unbeaten streak across all players: ${maxUnbeaten}`);
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
      tooltip: 'Experience points earned from playing games',
      formatter: (value) => {
        // Ensure XP is never negative - cap at 0
        return Math.max(0, value || 0);
      }
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
      key: 'unbeatenRate', 
      label: 'Unbeaten %', 
      sortable: true,
      tooltip: 'Unbeaten percentage (wins + draws / total games)',
      formatter: (_, player) => {
        if (!player) return '0.0%';
        
        const wins = player.wins || 0;
        const draws = player.draws || 0;
        const losses = player.losses || 0;
        const totalGames = wins + draws + losses;
        
        if (totalGames === 0) return '0.0%';
        
        // Calculate unbeaten percentage (wins + draws) / total games
        const unbeatenPercentage = ((wins + draws) / totalGames) * 100;
        return `${unbeatenPercentage.toFixed(1)}%`;
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
      key: 'goalRatio', 
      label: 'GF/GA Ratio', 
      sortable: true, 
      tooltip: 'Goals For/Against Ratio (similar to K/D ratio in FPS games)',
      formatter: (_, player) => {
        // Calculate goals for/against ratio
        if (!player) return 'N/A';
        
        const goalsFor = player.goalsFor || 0;
        const goalsAgainst = player.goalsAgainst || 0;
        
        // Handle division by zero case
        if (goalsAgainst === 0) {
          // If goalsFor is also 0, ratio is 0. Otherwise, it's technically infinite
          return goalsFor === 0 ? 
            <span className="font-semibold">0.00</span> : 
            <span className="font-semibold text-green-600">∞</span>;
        }
        
        // Calculate ratio and format to 2 decimal places
        const ratio = goalsFor / goalsAgainst;
        const formattedRatio = ratio.toFixed(2);
        
        // Color based on value: green if > 1, red if < 1, neutral if = 1
        const colorClass = ratio > 1 ? 'text-green-600' : ratio < 1 ? 'text-red-600' : '';
        
        return <span className={`font-semibold ${colorClass}`}>{formattedRatio}</span>;
      }
    },
    { 
      key: 'winStreaks', 
      label: 'Win Streak', 
      sortable: true,
      tooltip: 'Win streak - bar shows max streak with marker at current position',
      formatter: (_, player) => {
        if (!player) return 'N/A';
        
        return <StreakBar 
          currentStreak={player.currentWinStreak || 0}
          maxStreak={player.maxWinStreak || 0}
          label="Win"
          tableMax={maxWinStreakValue}
        />;
      }
    },
    { 
      key: 'unbeatenStreaks', 
      label: 'Unbeaten Streak', 
      sortable: true,
      tooltip: 'Unbeaten streak (wins and draws) - bar shows max streak with marker at current position',
      formatter: (_, player) => {
        if (!player) return 'N/A';
        
        return <StreakBar 
          currentStreak={player.currentUnbeatenStreak || 0}
          maxStreak={player.maxUnbeatenStreak || 0}
          label="Unbeaten"
          tableMax={maxUnbeatenStreakValue}
        />;
      }
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
    
    // Helper functions for sorting specific columns
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
      } else {
        const aValue = a.goalsAgainst || 0;
        const bValue = b.goalsAgainst || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
    };
    
    // Handle sorting for the combined streak columns
    const actualSortColumn = sortColumn === 'winStreaks' 
      ? 'maxWinStreak' 
      : sortColumn === 'unbeatenStreaks'
        ? 'maxUnbeatenStreak'
        : sortColumn;
    
    // Return sorted players array
    return [...filteredPlayers].sort((a, b) => {
      // Special handling for specific columns
      if (sortColumn === 'teamDistribution') {
        return sortByTeamDistribution(a, b);
      }
      
      if (sortColumn === 'goals') {
        return sortByGoals(a, b);
      }
      
      if (sortColumn === 'winStreaks') {
        const aValue = a.maxWinStreak || 0;
        const bValue = b.maxWinStreak || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (sortColumn === 'unbeatenStreaks') {
        const aValue = a.maxUnbeatenStreak || 0;
        const bValue = b.maxUnbeatenStreak || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (sortColumn === 'unbeatenRate') {
        // Calculate unbeaten percentages for sorting
        const aWins = a.wins || 0;
        const aDraws = a.draws || 0;
        const aLosses = a.losses || 0;
        const aTotalGames = aWins + aDraws + aLosses;
        
        const bWins = b.wins || 0;
        const bDraws = b.draws || 0;
        const bLosses = b.losses || 0;
        const bTotalGames = bWins + bDraws + bLosses;
        
        // Calculate unbeaten percentages
        const aUnbeatenRate = aTotalGames === 0 ? 0 : ((aWins + aDraws) / aTotalGames) * 100;
        const bUnbeatenRate = bTotalGames === 0 ? 0 : ((bWins + bDraws) / bTotalGames) * 100;
        
        // Sort based on direction (asc or desc)
        return sortDirection === 'asc' ? aUnbeatenRate - bUnbeatenRate : bUnbeatenRate - aUnbeatenRate;
      }
      
      if (sortColumn === 'goalRatio') {
        // Calculate ratios
        const aGoalsFor = a.goalsFor || 0;
        const aGoalsAgainst = a.goalsAgainst || 0;
        const bGoalsFor = b.goalsFor || 0;
        const bGoalsAgainst = b.goalsAgainst || 0;
        
        // Handle division by zero cases
        let aRatio = aGoalsAgainst === 0 ? (aGoalsFor === 0 ? 0 : Number.MAX_VALUE) : aGoalsFor / aGoalsAgainst;
        let bRatio = bGoalsAgainst === 0 ? (bGoalsFor === 0 ? 0 : Number.MAX_VALUE) : bGoalsFor / bGoalsAgainst;
        
        return sortDirection === 'asc' ? aRatio - bRatio : bRatio - aRatio;
      }
      
      // Get the values to compare based on sort column
      const aValue: any = a[actualSortColumn as keyof ComprehensivePlayerStats];
      const bValue: any = b[actualSortColumn as keyof ComprehensivePlayerStats];
      
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
              className="input w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-square">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Responsive view - switch between table (desktop) and cards (mobile) */}
        {!isMobileView ? (
          /* Desktop View - Standard Table */
          <div className="overflow-x-auto hidden md:block">
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
                            ? Math.max(0, player.xp || 0) /* Ensure XP always shows a non-negative value */
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
        ) : (
          /* Mobile View - Card-based layout */
          <div className="md:hidden space-y-4">
            {/* Mobile sorting options */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  Sort Players By:
                </span>
                <div className="flex items-center gap-1 text-xs">
                  <span>Order:</span>
                  <button 
                    className={`p-1 rounded ${sortDirection === 'desc' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                    onClick={() => setSortDirection('desc')}
                    aria-label="Descending order"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    className={`p-1 rounded ${sortDirection === 'asc' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                    onClick={() => setSortDirection('asc')}
                    aria-label="Ascending order"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              
              {/* Categories */}
              <div className="grid grid-cols-3 gap-1">
                {/* Player Name */}
                <button 
                  className={`py-1 px-2 text-xs rounded ${sortColumn === 'friendlyName' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                  onClick={() => handleSort('friendlyName')}
                >
                  Player Name
                </button>
                
                {/* XP */}
                <button 
                  className={`py-1 px-2 text-xs rounded ${sortColumn === 'xp' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                  onClick={() => handleSort('xp')}
                >
                  XP
                </button>
                
                {/* Caps */}
                <button 
                  className={`py-1 px-2 text-xs rounded ${sortColumn === 'caps' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                  onClick={() => handleSort('caps')}
                >
                  Caps
                </button>
                
                {/* Win % */}
                <button 
                  className={`py-1 px-2 text-xs rounded ${sortColumn === 'winRate' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                  onClick={() => handleSort('winRate')}
                >
                  Win %
                </button>
                
                {/* Unbeaten % */}
                <button 
                  className={`py-1 px-2 text-xs rounded ${sortColumn === 'unbeatenRate' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                  onClick={() => handleSort('unbeatenRate')}
                >
                  Unbeaten %
                </button>
                
                {/* Goal Diff */}
                <button 
                  className={`py-1 px-2 text-xs rounded ${sortColumn === 'goalDifferential' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                  onClick={() => handleSort('goalDifferential')}
                >
                  Goal +/-
                </button>
                
                {/* Goals */}
                <button 
                  className={`py-1 px-2 text-xs rounded ${sortColumn === 'goals' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                  onClick={() => {
                    // Replicate the multi-sort cycling for goals
                    if (sortColumn === 'goals') {
                      if (goalsSortMetric === 'goalsFor' && sortDirection === 'desc') {
                        // First click already happened, now switch to asc
                        setSortDirection('asc');
                      } else if (goalsSortMetric === 'goalsFor' && sortDirection === 'asc') {
                        // Switch to goalsAgainst, desc
                        setGoalsSortMetric('goalsAgainst');
                        setSortDirection('desc');
                      } else if (goalsSortMetric === 'goalsAgainst' && sortDirection === 'desc') {
                        // Switch to goalsAgainst, asc
                        setSortDirection('asc');
                      } else {
                        // Reset to goalsFor, desc
                        setGoalsSortMetric('goalsFor');
                        setSortDirection('desc');
                      }
                    } else {
                      // Initial click
                      setSortColumn('goals');
                      setGoalsSortMetric('goalsFor');
                      setSortDirection('desc');
                    }
                  }}
                >
                  {sortColumn === 'goals' ? 
                    `Goals (${goalsSortMetric === 'goalsFor' ? 'GF' : 'GA'})` : 
                    'Goals'}
                </button>
                
                {/* GF/GA Ratio */}
                <button 
                  className={`py-1 px-2 text-xs rounded ${sortColumn === 'goalRatio' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                  onClick={() => handleSort('goalRatio')}
                >
                  GF/GA Ratio
                </button>
                
                {/* Win Streak */}
                <button 
                  className={`py-1 px-2 text-xs rounded ${sortColumn === 'winStreaks' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
                  onClick={() => handleSort('winStreaks')}
                >
                  Win Streak
                </button>
              </div>
            </div>
            
            {/* List of sorted players */}
            {sortedPlayers.length > 0 ? (
              <div className="space-y-4">
                {sortedPlayers.map((player) => (
                  <motion.div 
                    key={player.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="card bg-base-200 shadow-sm"
                  >
                    {/* Card header with player name, XP and toggle button */}
                    <div className="card-body p-4 pb-2">
                      <div 
                        className="flex justify-between items-center cursor-pointer" 
                        onClick={() => togglePlayerExpanded(player.id)}
                      >
                        <div className="flex flex-col">
                          <h3 className="card-title text-lg">{player.friendlyName}</h3>
                          <p className="text-sm opacity-80">XP: {Math.max(0, player.xp || 0)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-semibold">Win %</div>
                            <div>
                              {player.winRate !== null && player.winRate !== undefined ? 
                                `${parseFloat(player.winRate.toString()).toFixed(1)}%` : 
                                '0.0%'}
                            </div>
                          </div>
                          {expandedPlayers[player.id] ? 
                            <ChevronDown className="h-5 w-5" /> : 
                            <ChevronRight className="h-5 w-5" />
                          }
                        </div>
                      </div>
                      
                      {/* Main stats summary - always visible */}
                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <div className="font-semibold">Caps</div>
                          <div>{player.caps || 0}</div>
                        </div>
                        <div>
                          <div className="font-semibold">Results</div>
                          <div className="mt-1">
                            <GameResultsBar 
                              wins={player.wins || 0}
                              losses={player.losses || 0}
                              draws={player.draws || 0}
                              mobile={true}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded stats - only visible when expanded */}
                      {expandedPlayers[player.id] && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 pt-3 border-t border-base-300 text-sm"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="font-semibold">Unbeaten %</div>
                              <div>
                                {(() => {
                                  const wins = player.wins || 0;
                                  const draws = player.draws || 0;
                                  const losses = player.losses || 0;
                                  const totalGames = wins + draws + losses;
                                  
                                  if (totalGames === 0) return '0.0%';
                                  
                                  const unbeatenPercentage = ((wins + draws) / totalGames) * 100;
                                  return `${unbeatenPercentage.toFixed(1)}%`;
                                })()}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold">Goal +/-</div>
                              <div>
                                {(() => {
                                  const value = player.goalDifferential;
                                  if (value === null || value === undefined) return 'N/A';
                                  const formattedValue = value > 0 ? `+${value}` : value;
                                  const colorClass = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
                                  return <span className={`font-semibold ${colorClass}`}>{formattedValue}</span>;
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <div className="font-semibold">Goals</div>
                            <div className="mt-1">
                              <GoalsDistributionBar 
                                goalsFor={player.goalsFor}
                                goalsAgainst={player.goalsAgainst}
                                goalDifferential={player.goalDifferential}
                                mode="for-against"
                                mobile={true}
                              />
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <div className="font-semibold">Team Colours</div>
                            <div className="mt-1">
                              {(() => {
                                if (!player || player.caps === 0) return 'N/A';
                                
                                // Calculate percentages - ensure they add up to 100%
                                let bluePercentage = player.blueTeamPercentage || 0;
                                let orangePercentage = player.orangeTeamPercentage || 0;
                                
                                // Calculate missing percentages if needed
                                if (bluePercentage > 0 && orangePercentage === 0) {
                                  orangePercentage = 100 - bluePercentage;
                                } else if (orangePercentage > 0 && bluePercentage === 0) {
                                  bluePercentage = 100 - orangePercentage;
                                }
                                
                                return <TeamDistributionBar 
                                  bluePercentage={bluePercentage}
                                  orangePercentage={orangePercentage}
                                  mobile={true}
                                />;
                              })()}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <div className="font-semibold">Win Streak</div>
                              <div className="mt-1">
                                <StreakBar 
                                  currentStreak={player.currentWinStreak || 0}
                                  maxStreak={player.maxWinStreak || 0}
                                  label="Win"
                                  tableMax={maxWinStreakValue}
                                  mobile={true}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold">Unbeaten Streak</div>
                              <div className="mt-1">
                                <StreakBar 
                                  currentStreak={player.currentUnbeatenStreak || 0}
                                  maxStreak={player.maxUnbeatenStreak || 0}
                                  label="Unbeaten"
                                  tableMax={maxUnbeatenStreakValue}
                                  color="amber"
                                  mobile={true}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 bg-base-200 rounded-lg space-y-3">
                <p className="text-lg">No players found</p>
                <p className="text-sm opacity-70">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        )}
        
        <p className="text-sm opacity-80 mt-4">
          Note: Stats are based on games with known outcomes. Players must have at least 10 games with known outcomes (wins/losses/draws) to be displayed.
          <strong> {sortedPlayers.length} players shown.</strong>
        </p>
      </div>
    </motion.div>
  );
};
