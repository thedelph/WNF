# useStats Hook

## Overview
The `useStats` hook is a central data management hook that provides player statistics and game data throughout the application. It handles fetching, processing, and caching of various statistics from the Supabase backend, including comprehensive player stats, XP values, goal differentials, and team colour statistics.

## Features
- Fetches various statistics from the Supabase database
- Provides comprehensive player statistics with XP values
- Implements data resilience mechanisms to prevent data loss
- Processes and transforms raw data into usable formats
- Manages loading and error states
- Caches data to prevent unnecessary refetching
- Preserves valid data between renders and component updates

## Technical Implementation

### State Management
The hook uses a combination of React's `useState` and `useRef` to manage data:

```tsx
// State management with persistence for comprehensive stats
const [stats, setStats] = useState<Stats>({
  // Initial state values...
});

// Track if comprehensive stats have been loaded directly
const directFetchRef = useRef(false);

// Preserve the last successful stats
const lastSuccessfulStatsRef = useRef<ComprehensivePlayerStats[]>([]);
```

### Data Fetching
The hook provides several methods for fetching different types of statistics:

```tsx
// General stats fetching
const fetchStats = async (year: string | number) => {
  // Fetch various statistics...
};

// Comprehensive player stats (with XP values)
const fetchComprehensivePlayerStats = async (year: string | number) => {
  // Mark that we're doing a direct fetch to prevent other effects from overriding our data
  directFetchRef.current = true;
  
  // If we already have successful stats, keep using them while loading
  if (lastSuccessfulStatsRef.current.length > 0) {
    // Pre-update with existing data to avoid flicker
    setStats(prevStats => ({
      ...prevStats,
      comprehensiveStats: lastSuccessfulStatsRef.current,
      loading: true
    }));
  }
  
  // Fetch and process data...
};
```

### Data Persistence Mechanisms
The hook implements several mechanisms to prevent data loss:

1. **Direct Fetch Tracking**: Uses `directFetchRef` to mark when comprehensive stats are loaded directly, preventing them from being overwritten by automatic updates.

2. **Last Successful Stats Cache**: Maintains a reference to the last successfully loaded stats in `lastSuccessfulStatsRef`, ensuring data is preserved even if subsequent fetches fail.

3. **Conditional State Updates**: Only updates comprehensive stats if not already loaded directly, preserving user-requested data.

```tsx
// Generate comprehensive player stats only if not already loaded directly
comprehensiveStats: directFetchRef.current
  ? (lastSuccessfulStatsRef.current.length > 0 ? lastSuccessfulStatsRef.current : stats.comprehensiveStats)
  : generateComprehensivePlayerStats(
      playersList || [],
      transformedPlayerStats,
      goalDifferentials || [],
      transformedTeamColorStats
    ),
```

4. **Successful Data Preservation**: When data is successfully loaded, it's stored in the ref for future use:

```tsx
// Preserve the successful stats for future use
if (sortedStats.length > 0) {
  console.log(`Preserving ${sortedStats.length} player stats to prevent data loss`);
  lastSuccessfulStatsRef.current = sortedStats;
}
```

### Data Processing
The hook includes several data processing functions to transform raw database data into usable formats:

- `generateComprehensivePlayerStats`: Combines data from multiple sources to create comprehensive player statistics
- `transformPlayerStats`: Processes raw player stats into a standardised format
- `sortByWinRateDesc`: Sorts players by win rate
- `sortByMaxStreakDesc`: Sorts players by maximum win streak
- `sortByCurrentStreakDesc`: Sorts players by current win streak

### Error Handling
The hook implements comprehensive error handling for all data fetching operations, ensuring that UI components receive appropriate error states:

```tsx
try {
  // Data fetching operations...
} catch (error) {
  console.error('Error fetching stats:', error);
  setStats(prevStats => ({
    ...prevStats,
    loading: false,
    error: error instanceof Error ? error.message : 'Unknown error fetching stats'
  }));
}
```

## Usage
This hook is used throughout the application to access player statistics:

```tsx
// Example usage in a component
const { 
  loading, 
  error, 
  comprehensiveStats, 
  fetchComprehensivePlayerStats 
} = useStats();

// Fetch comprehensive player stats for a specific year
useEffect(() => {
  if (selectedYear) {
    fetchComprehensivePlayerStats(selectedYear);
  }
}, [selectedYear, fetchComprehensivePlayerStats]);

// Render stats in the component
return (
  <div>
    {loading && <LoadingSpinner />}
    {error && <ErrorMessage message={error} />}
    {comprehensiveStats && <StatsTable data={comprehensiveStats} />}
  </div>
);
```

## Edge Cases and Error Handling
The hook handles several edge cases:
- Empty or null data from the database
- Failed API requests
- Typecasting issues with database responses
- Preventing loss of valid data during re-renders
- XP values resetting to zero

## Performance Considerations
- Uses refs to maintain state between renders without triggering re-renders
- Implements conditional fetching to prevent unnecessary API calls
- Preserves valid data to provide uninterrupted user experience
- Manages loading state to indicate background data fetching

## Known Issues
- Some TypeScript implicit 'any' types need to be properly typed
- Possible undefined properties in some sorting comparisons
- The property 'xp' needs to be added to the PlayerStats interface

## Recent Updates

### May 2025 Updates
1. **Best Win Rates Processing**: Modified the hook to return the top 10 players by win rate for the bestWinRates data, rather than only including players with win rates equal to or higher than the bronze medal position.

## Future Improvements
- Complete TypeScript typing for all parameters and variables
- Implement more robust error recovery mechanisms
- Add data caching with TTL (Time To Live)
- Implement pagination for large datasets
- Add more comprehensive logging for debugging
- Refactor to reduce complexity and improve maintainability
