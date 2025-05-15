import { useState, useMemo, useEffect } from 'react';
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
  const [sortColumn, setSortColumn] = useState('caps');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Use the stats hook to get player statistics
  const { loading, error, comprehensiveStats, fetchComprehensivePlayerStats } = useStats();
  
  // Fetch comprehensive player stats when the component mounts or year changes
  useEffect(() => {
    // Fetch data for the selected year
    fetchComprehensivePlayerStats(selectedYear);
    
    // Add console logging to help debug
    console.log('Fetching comprehensive stats for year:', selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

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
    if (!comprehensiveStats) return [];
    
    if (!searchQuery) return comprehensiveStats;
    
    // Filter by player name matching the search query
    return comprehensiveStats.filter(player => 
      player.friendlyName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [comprehensiveStats, searchQuery]);
  
  // Sort players based on current sort settings
  const sortedPlayers = useMemo(() => {
    if (!filteredPlayers.length) return [];
    
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

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
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
        <div className="alert alert-warning mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <h3 className="font-bold">Work In Progress - Data Not Accurate</h3>
            <p className="text-sm">This stats table is still being developed and the data shown may contain inaccuracies. Updates coming soon.</p>
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
