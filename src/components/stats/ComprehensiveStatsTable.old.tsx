import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, Info } from 'lucide-react';
import { useStats } from '../../hooks/useStats';
import { Tooltip } from '../ui/Tooltip';

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
 * ComprehensiveStatsTable component - Displays a comprehensive table of player statistics
 * 
 * Includes all player stats in a sortable, searchable table:
 * - XP Leaderboard
 * - Caps
 * - Goals For/Against/Difference
 * - Win Streaks (Current/Longest)
 * - Unbeaten Streaks (Current/Longest)
 * - Win Rate
 * - Team Color Specialties
 * 
 * @param stats - The stats object from useStats hook
 * @param selectedYear - The currently selected year filter
 */
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
    // Clear previous data before fetching new data to prevent flash of old data
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
      key: 'teamPercentage', 
      label: 'Team Distribution', 
      sortable: true,
      tooltip: 'Distribution of games played on blue vs. orange team',
      // The _ is used to ignore the first parameter (value) since we're using the player object directly
      formatter: (_, player) => {
        // Make sure player exists and has played games
        if (!player || player.caps === 0) return 'N/A';
        
        // Calculate percentages - ensure they add up to 100%
        let bluePercentage = player.blueTeamPercentage || 0;
        let orangePercentage = player.orangeTeamPercentage || 0;
        
        // If we have only one percentage, calculate the other
        if (bluePercentage > 0 && orangePercentage === 0) {
          orangePercentage = 100 - bluePercentage;
        } else if (orangePercentage > 0 && bluePercentage === 0) {
          bluePercentage = 100 - orangePercentage;
        }
        
        return (
          <div className="flex flex-col w-full gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-blue-500 font-semibold">{bluePercentage.toFixed(1)}%</span>
              <span className="text-orange-500 font-semibold">{orangePercentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden border border-gray-300 flex">
              <div 
                className="bg-blue-500 h-full transition-all duration-300 ease-in-out" 
                style={{ width: `${bluePercentage}%` }}
              />
              <div 
                className="bg-orange-500 h-full transition-all duration-300 ease-in-out" 
                style={{ width: `${orangePercentage}%` }}
              />
            </div>
          </div>
        );
      }
    }
  ];

  // Filter players based on search query
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim() || !comprehensiveStats) {
      return comprehensiveStats || [];
    }
    
    const query = searchQuery.toLowerCase();
  
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
key: 'teamPercentage', 
label: 'Team Distribution', 
sortable: true,
tooltip: 'Distribution of games played on blue vs. orange team',
// The _ is used to ignore the first parameter (value) since we're using the player object directly
formatter: (_, player) => {
// Make sure player exists and has played games
if (!player || player.caps === 0) return 'N/A';
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Display year information in the title if a specific year is selected
  const yearDisplay = selectedYear === 'all' ? 'All Time' : selectedYear;

  // Loading state - only show loading indicator on initial load
  // If we already have data, continue showing it while loading new data
  if (loading && !comprehensiveStats?.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl font-semibold">Loading player statistics...</div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl font-semibold text-red-500">Error loading player statistics</div>
      </div>
    );
  }
  
  // No data state
  if (!comprehensiveStats || comprehensiveStats.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl font-semibold">No player statistics available</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card bg-base-100 shadow-xl overflow-x-auto"
    >
      <div className="card-body">
        <h2 className="card-title text-xl font-bold mb-4">
          Comprehensive Player Stats {selectedYear !== 'all' && <span className="text-sm font-normal ml-2">({yearDisplay})</span>}
        </h2>
        
        {/* Search input */}
        <div className="form-control mb-4">
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
                      {(() => {
                        // Handle special cases for team percentages
                        // Since a player can only be on blue team or orange team in any game,
                        // the percentages should always add up to 100%
                        if (column.key === 'blueTeamPercentage') {
                          if (player.caps === 0) return 'N/A';
                          // If we have blue percentage, use it
                          if (player.blueTeamPercentage !== null) {
                            return `${player.blueTeamPercentage.toFixed(1)}%`;
                          }
                          // Otherwise calculate from orange (100% - orange%)
                          else if (player.orangeTeamPercentage !== null) {
                            const bluePercentage = 100 - player.orangeTeamPercentage;
                            return `${bluePercentage.toFixed(1)}%`;
                          }
                          // Fallback to 0% if neither is available but player has caps
                          return '0.0%';
                        }
                        if (column.key === 'orangeTeamPercentage') {
                          if (player.caps === 0) return 'N/A';
                          // If we have orange percentage, use it
                          if (player.orangeTeamPercentage !== null) {
                            return `${player.orangeTeamPercentage.toFixed(1)}%`;
                          }
                          // Otherwise calculate from blue (100% - blue%)
                          else if (player.blueTeamPercentage !== null) {
                            const orangePercentage = 100 - player.blueTeamPercentage;
                            return `${orangePercentage.toFixed(1)}%`;
                          }
                          // Fallback to 0% if neither is available but player has caps
                          return '0.0%';
                        }
                        if (column.key === 'winRate') {
                          // Format win rate as percentage with 1 decimal place
                          // The win rate is stored as a decimal (e.g., 0.619 for 61.9%)
                          const winRate = player.winRate || 0;
                          // Multiply by 100 to convert decimal to percentage
                          return `${(winRate * 100).toFixed(1)}%`;
                        }
                        
                        // Use formatter if provided
                        if (column.formatter) {
                          const value = player[column.key as keyof ComprehensivePlayerStats];
                          return column.formatter(value, player);
                        }
                        
                        // Default display
                        const value = player[column.key as keyof ComprehensivePlayerStats];
                        return value !== undefined && value !== null ? value : 'N/A';
                      })()}
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
