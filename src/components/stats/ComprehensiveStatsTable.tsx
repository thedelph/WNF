import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, Info } from 'lucide-react';
import { useStats } from '../../hooks/useStats';
import { Tooltip } from '../ui/Tooltip';
import { TeamDistributionBar } from './TeamDistributionBar';

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
  label: string;
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
      tooltip: 'Experience points earned based on attendance, streaks, and other factors'
    },
    { 
      key: 'caps', 
      label: 'Caps', 
      sortable: true,
      tooltip: 'Total number of games played'
    },
    { 
      key: 'goalsFor', 
      label: 'GF', 
      sortable: true,
      tooltip: 'Goals scored by the player\'s team while they were playing'
    },
    { 
      key: 'goalsAgainst', 
      label: 'GA', 
      sortable: true,
      tooltip: 'Goals conceded by the player\'s team while they were playing'
    },
    { 
      key: 'goalDifferential', 
      label: '+/-', 
      sortable: true,
      tooltip: 'Goal difference (Goals For - Goals Against)',
      formatter: (value) => (
        <span className={value > 0 ? 'text-success' : value < 0 ? 'text-error' : ''}>
          {value > 0 ? `+${value}` : value}
        </span>
      )
    },
    { 
      key: 'winRate', 
      label: 'Win %', 
      sortable: true,
      tooltip: 'Win percentage (wins / total games)',
      formatter: (value) => {
        if (value !== null && value !== undefined) {
          // Win rate is stored as a decimal (e.g., 0.619), so multiply by 100 for display
          return `${(value * 100).toFixed(1)}%`;
        }
        return '0.0%';
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

  // Filter players based on search query
  const filteredPlayers = useMemo(() => {
    // Basic search filtering - use valid stats if current stats are empty
    const statsToUse = comprehensiveStats?.length ? comprehensiveStats : validStatsRef.current;
    const searchFilter = searchQuery.toLowerCase() || '';
    
    // Only proceed with filtering if we have stats to filter
    if (!statsToUse || statsToUse.length === 0) {
      console.log('No stats available for filtering');
      return []; // Return empty array if no stats
    }
    
    const filtered = statsToUse.filter((player) =>
      player.friendlyName?.toLowerCase().includes(searchFilter)
    );
    
    console.log(`After filtering: ${filtered.length} players remain`);
    return filtered;
  }, [comprehensiveStats, searchQuery]);

  // Sort players based on current sort settings
  const sortedPlayers = useMemo(() => {
    if (!filteredPlayers.length) return [];
    
    // Debug log when sorting happens
    console.log(`Sorting ${filteredPlayers.length} players by ${sortColumn} ${sortDirection}`);
    
    return [...filteredPlayers].sort((a, b) => {
      // Special handling for team distribution column (sort by blue team percentage)
      if (sortColumn === 'teamDistribution') {
        const aValue = a.blueTeamPercentage || 0;
        const bValue = b.blueTeamPercentage || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
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
  }, [filteredPlayers, sortColumn, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
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
        {/* Warning banner for work in progress */}
        <div className="alert alert-info mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <h3 className="font-bold">Player Stats Information</h3>
            <p className="text-sm">These comprehensive player stats include XP values calculated according to the XP system formula. Stats are refreshed automatically when changing year filters.</p>
          </div>
        </div>
        
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
                      <span>{column.label}</span>
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
          Note: Stats are based on games with known outcomes. Some stats require a minimum of 10 caps to be displayed.
          <strong> {sortedPlayers.length} players shown.</strong>
        </p>
      </div>
    </motion.div>
  );
};
