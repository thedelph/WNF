# Comprehensive Stats Table

## Overview
The Comprehensive Stats Table displays detailed statistics for all players in a searchable, sortable table format. It provides a complete view of player performance metrics, including attendance, goals, win rates, streaks, and team distribution.

## Features
- Complete player statistics in a single, unified table
- Sortable columns for all metrics
- Search functionality for finding specific players
- Visual team distribution bar showing blue/orange team percentages
- Responsive design for all device sizes
- Tooltips providing additional context for each metric

## Component Structure
The component is built using several sub-components and features:

1. **Main table component**: `ComprehensiveStatsTable.tsx`
2. **Visual elements**:
   - `TeamDistributionBar.tsx`: Visual representation of team color distribution
   - Tooltips for providing additional context
3. **Data handling**:
   - Uses `useStats` hook to fetch data from the database
   - Implements filtering and sorting logic

## Data Source
The comprehensive player stats are fetched from the database using the `get_comprehensive_player_stats` function, which combines data from several sources:
- Player XP
- Game caps (attendance)
- Goal differentials
- Win rates
- Win and unbeaten streaks
- Team color statistics

## Technical Implementation

### Data Fetching
```tsx
// Fetch comprehensive player stats when the component mounts or year changes
useEffect(() => {
  fetchComprehensivePlayerStats(selectedYear);
  console.log('Fetching comprehensive stats for year:', selectedYear);
}, [selectedYear]);
```

### Filtering and Sorting
The component implements client-side filtering and sorting:

```tsx
// Filter players based on search query
const filteredPlayers = useMemo(() => {
  if (!comprehensiveStats) return [];
  if (!searchQuery) return comprehensiveStats;
  return comprehensiveStats.filter(player => 
    player.friendlyName.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [comprehensiveStats, searchQuery]);

// Sort players based on current sort settings
const sortedPlayers = useMemo(() => {
  if (!filteredPlayers.length) return [];
  return [...filteredPlayers].sort((a, b) => {
    // Special handling for team distribution
    if (sortColumn === 'teamDistribution') {
      const aValue = a.blueTeamPercentage || 0;
      const bValue = b.blueTeamPercentage || 0;
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    // Regular column sorting...
  });
}, [filteredPlayers, sortColumn, sortDirection]);
```

### Column Definitions
The table includes the following metrics:
- Player name
- XP (Experience points)
- Caps (Games played)
- GF (Goals For)
- GA (Goals Against)
- +/- (Goal Differential)
- Win % (Win percentage)
- Current Win Streak
- Longest Win Streak
- Current Unbeaten Streak
- Longest Unbeaten Streak
- Team Colors (Visual distribution of blue/orange team percentages)

### Visual Team Distribution Bar
The team distribution is displayed using a visual bar rather than separate percentage columns:

```tsx
{ 
  key: 'teamDistribution', 
  label: 'Team Colors', 
  sortable: true,
  tooltip: 'Distribution of games played on blue vs. orange team',
  formatter: (_, player) => {
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
    />;
  }
}
```

For more details on the TeamDistributionBar component, see [TeamDistributionBar.md](./TeamDistributionBar.md).

## Usage
The Comprehensive Stats Table is used on the Stats page and displays data based on the selected year filter:

```tsx
<ComprehensiveStatsTable selectedYear={selectedYear} />
```

## Edge Cases and Error Handling
The component handles several edge cases:
- Loading state: Displays a spinner while data is being fetched
- Error state: Shows an error message if data fetching fails
- Empty results: Displays a "No players found" message when search yields no results
- Null/undefined values: Safely handles missing data with fallbacks
- Players with 0 caps: Shows appropriate placeholders for stats

## Styling
The component uses a combination of:
- Tailwind CSS for layout and responsive design
- Daisy UI for component styling (cards, tables, etc.)
- Custom CSS for specific visual elements
- Framer Motion for animations

## Performance Considerations
- Uses `useMemo` for expensive operations like filtering and sorting
- Implements efficient rendering with proper React patterns
- Caches data to prevent unnecessary re-fetching

## Known Issues
As of May 2025, the component displays a warning banner indicating that some of the data may not be accurate. This is a temporary measure while data quality issues are being addressed.

## Future Improvements
Potential enhancements for this component:
- Add export functionality (CSV, PDF)
- Implement column visibility toggles
- Add more advanced filtering options
- Enhance mobile view with collapsible sections
- Add data visualization for more metrics
