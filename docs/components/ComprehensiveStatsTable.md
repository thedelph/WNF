# Comprehensive Stats Table

## Overview
The Comprehensive Stats Table displays detailed statistics for players in a searchable, sortable format that adapts to different screen sizes. It provides a complete view of player performance metrics, including attendance, goals, win rates, streaks, and team distribution. 

On desktop, it presents data in a traditional table layout, while on mobile devices it transforms into a card-based interface with expandable details for optimal viewing on smaller screens. The component includes data persistence features to ensure XP values and other stats are consistently displayed without disappearing or resetting to zero. Only players with 10 or more games with known outcomes (wins/losses/draws) are displayed to ensure statistical relevance.

## Features

### Core Features
- Complete player statistics in a unified format that adapts to device size
- Sortable data for all metrics on both desktop and mobile
- Search functionality for finding specific players
- Negative XP values automatically capped at 0
- Data resilience using React refs to prevent values from disappearing
- State preservation between re-renders and data fetches

### Statistic Visualization
- Dedicated Caps column showing total games played
- Results column with visual distribution of wins/draws/losses
- Win % column positioned logically next to Results
- Unbeaten % column showing percentage of games that weren't lost (wins + draws)
- Visual team distribution bar showing blue/orange team percentages
- Visual goals distribution bar showing goals for/against
- Visual streak bars showing current win/unbeaten streaks relative to personal bests
- GF/GA Ratio column showing goals for to goals against ratio (similar to K/D in FPS games)

### Responsive Design
- Automatically adapts between table view (desktop) and card view (mobile)
- Responsive card layout with expandable details on mobile
- Mobile-optimized sorting interface with all sort options accessible
- Tooltips providing additional context for each metric
- Optimized visual components for different screen sizes

## Component Structure
The component is built using several sub-components and features:

1. **Main component**: `ComprehensiveStatsTable.tsx`
   - Handles responsive view switching between table and card layouts
   - Implements window resize detection for dynamic view changes
   - Manages expandable player cards in mobile view

2. **Visual elements**:
   - `TeamDistributionBar.tsx`: Visual representation of team colours distribution
   - `GoalsDistributionBar.tsx`: Visual representation of goals for/against and goal differential
   - `GameResultsBar.tsx`: Visual representation of wins, losses, and draws distribution
   - `StreakBar.tsx`: Visual representation of current and maximum streaks with position markers
   - Tooltips for providing additional context
   - Mobile-optimized versions of all visual components

3. **Data handling**:
   - Uses `useStats` hook to fetch data from the database
   - Implements filtering and sorting logic for both desktop and mobile views
   - Maintains consistent sorting capabilities across device sizes

## Data Source
The comprehensive player stats are fetched from the database using the `get_comprehensive_player_stats` function, which combines data from several sources:
- Player XP
- Game caps (attendance)
- Goal differentials
- Win rates
- Win and unbeaten streaks
- Team color statistics

## Technical Implementation

### Data Fetching and Persistence
```tsx
// Keep a reference to valid stats to avoid losing them during re-renders
const validStatsRef = useRef<ComprehensivePlayerStats[]>([]);

// Success callback for direct stats fetch
const onComprehensiveStatsLoaded = useCallback((players: ComprehensivePlayerStats[]) => {
  if (players?.length) {
    console.log(`Successfully loaded ${players.length} players with XP data`);
    // Update our valid stats reference
    validStatsRef.current = players;
  }
}, [searchQuery]);

// Fetch comprehensive player stats when the component mounts or year changes
useEffect(() => {
  console.log(`Fetching comprehensive stats for year: ${year}`);
  if (year) {
    fetchComprehensivePlayerStats(year);
  }
}, [year, fetchComprehensivePlayerStats]);
```

### XP Value Management
The component ensures that XP values are never displayed as negative by implementing capping logic in multiple places:

```tsx
// XP column formatter to ensure non-negative values
{ 
  key: 'xp', 
  label: 'XP', 
  sortable: true,
  tooltip: 'Experience points earned from playing games',
  formatter: (value) => {
    // Ensure XP is never negative - cap at 0
    return Math.max(0, value || 0);
  }
}

// In the table view display
column.key === 'xp' ? Math.max(0, player.xp || 0) : player[column.key as keyof ComprehensivePlayerStats]

// In the mobile card view
<p className="text-sm opacity-80">XP: {Math.max(0, player.xp || 0)}</p>
```

### Filtering and Sorting with Data Resilience
The component implements client-side filtering and sorting with resilience against data loss. Only players with 10 or more games with known outcomes (wins+losses+draws) are displayed to ensure statistical relevance:

```tsx
// Filter players based on search query and minimum 10 known outcomes requirement
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
- Caps (Games played with visual breakdown of wins, losses and draws)
- Goals (Visual representation of Goals For vs Goals Against)
- +/- (Goal Differential)
- Win % (Win percentage)
- Current Win Streak
- Longest Win Streak
- Current Unbeaten Streak
- Longest Unbeaten Streak
- Team Colours (Visual distribution of blue/orange team percentages)

### Dedicated Caps and Results Columns
The attendance and game outcomes have been separated into two distinct columns for clarity:

1. **Caps Column**: Shows the total number of games played by a player, regardless of whether the outcome is known or not.

2. **Results Column**: Displays only the games with known outcomes using a visual bar chart.

### Visual Game Results Bar
The game results are displayed using a visual bar that shows the breakdown of wins, draws, and losses in a logical progression with color-coding:

```tsx
// Caps column - total number of games played
{ 
  key: 'caps', 
  label: 'Caps', 
  sortable: true,
  tooltip: 'Total number of games played',
  formatter: (value) => {
    return value || 0;
  }
}

// Results column - visual breakdown of games with known outcomes
{ 
  key: 'results', 
  label: 'Results', 
  sortable: true,
  tooltip: 'Distribution of known game results (W/D/L)',
  formatter: (_, player) => {
    if (!player) return 'N/A';
    
    return <GameResultsBar 
      wins={player.wins || 0}
      losses={player.losses || 0}
      draws={player.draws || 0}
    />;
  }
}
```

The `GameResultsBar` component uses a consistent layout with:
- Left side: Total number of caps displayed
- Right side: Win/loss/draw counts with color coding
- Visual bar below showing the proportional segments

Color coding used in the component:
- Wins in green
- Losses in red
- Draws in purple
- Unknown results in grey (if any)

This provides an at-a-glance understanding of a player's performance record beyond just seeing the total number of games played.

### Visual Team Distribution Bar
The team distribution is displayed using a visual bar rather than separate percentage columns:

```tsx
{ 
  key: 'teamDistribution', 
  label: 'Team Colours', 
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

The `TeamDistributionBar` component uses a consistent layout pattern with:
- Blue team percentage displayed on the left in blue text
- Orange team percentage displayed on the right in orange text
- Visual bar below showing the proportional blue and orange segments

For more details on the TeamDistributionBar component, see [TeamDistributionBar.md](./TeamDistributionBar.md).

### Visual Goals Distribution Bar
Similarly, the goals are displayed using a visual bar to represent goals for (green) vs goals against (red):

```tsx
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
}
```

The `GoalsDistributionBar` component follows a consistent layout pattern:
- Goals For count displayed on the left in green text
- Goals Against count displayed on the right in red text
- Visual bar below showing the proportional green and red segments

### Win Percentage Column
The Win % column has been repositioned to appear directly after the Results column for a more logical data grouping. This improves the user experience by placing related metrics next to each other.

```tsx
{ 
  key: 'winRate', 
  label: 'Win %', 
  sortable: true,
  tooltip: 'Win percentage (wins / total games)',
  formatter: (value) => {
    if (value !== null && value !== undefined) {
      return `${parseFloat(value.toString()).toFixed(1)}%`;
    }
    return '0.0%';
  }
}
```

### Unbeaten Percentage Column
The Unbeaten % column shows the percentage of games that weren't lost (wins + draws combined), providing a broader view of player performance beyond just wins. This is positioned after the Win % column to allow easy comparison between the two metrics.

```tsx
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
}
```

The Unbeaten % column includes custom sorting logic to ensure it works correctly with both ascending and descending sorting:

```tsx
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
```

This custom sorting logic is needed because the Unbeaten % is a calculated value that doesn't directly exist in the player data object. The sorting follows the same pattern as other calculated columns, supporting both ascending (lowest to highest) and descending (highest to lowest) sort directions.

All three visual bar components (GameResultsBar, GoalsDistributionBar, and TeamDistributionBar) follow a consistent vertical alignment pattern with colored text indicators at the top and a proportional colored bar below for easy visual comparison.

The goals column features a multi-sort capability that allows users to cycle through all possible combinations of goals metrics and sort directions by clicking repeatedly on the column header:

1. **First click**: Sort by Goals For (GF) in descending order (highest scorers at top)
2. **Second click**: Sort by Goals For (GF) in ascending order (lowest scorers at top)
3. **Third click**: Sort by Goals Against (GA) in descending order (most conceded at top)
4. **Fourth click**: Sort by Goals Against (GA) in ascending order (least conceded at top)
5. **Fifth click**: Back to Goals For (GF) in descending order

This provides users with complete flexibility to analyze player performance based on offensive (Goals For) or defensive (Goals Against) metrics from a single column. The column header dynamically changes to indicate both which metric is being used for sorting and the sort direction (using ↑ for ascending and ↓ for descending).

The component also has the capability to display goal differential using a centered bar that extends left (red) for negative values or right (green) for positive values - this can be enabled by setting the `mode` property to `"differential"` in the GoalsDistributionBar component.

### Visual Streak Bars
The streak information is displayed using visual bars that show both the maximum streak and current streak in a single component:

```tsx
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
}
```

The `StreakBar` component provides these key features:
- Shows maximum win/unbeaten streak as a bar relative to the highest streak in the table
- Displays a "You Are Here" marker showing where the current streak sits relative to the personal best
- Uses distinct color coding: purple for win streaks and amber/gold for unbeaten streaks
- Includes a visual legend explaining the elements

## Usage
The Comprehensive Stats Table is used on the Stats page and displays data based on the selected year filter:

```tsx
<ComprehensiveStatsTable selectedYear={selectedYear} />
```

## Edge Cases and Error Handling
The component handles several edge cases:
- Loading state: Displays a spinner while data is being fetched, but only when no previous data exists
- Error state: Shows an error message if data fetching fails
- Empty results: Displays a "No players found" message when search yields no results
- Null/undefined values: Safely handles missing data with fallbacks
- Players with fewer than 10 games with known outcomes: Filtered out completely from the display
- Data loss prevention: Maintains valid stats in a React ref to prevent data from disappearing
- Re-render protection: Prevents XP values from being reset to zero during component updates

## Responsive Design Implementation

### Desktop View
On larger screens (md breakpoint and above), the component displays a traditional table with horizontal scrolling for wide content:

```tsx
// Desktop table view - only visible on md screens and above
<div className="overflow-x-auto hidden md:block">
  <table className="table table-zebra w-full">
    {/* Table content */}
  </table>
</div>
```

### Mobile View
On smaller screens, the component switches to a card-based layout with expandable details:

```tsx
// Mobile card view - visible on screens smaller than md breakpoint
<div className="md:hidden space-y-4">
  {/* Mobile sorting options */}
  <div className="flex flex-col gap-2 mb-4">
    {/* Sorting buttons */}
  </div>
  
  {/* Card list */}
  <div className="space-y-4">
    {sortedPlayers.map((player) => (
      <motion.div className="card bg-base-200 shadow-sm">
        {/* Card header with essential info */}
        <div className="card-body p-4 pb-2">
          {/* Player name, XP, and Win % always visible */}
          
          {/* Expandable detailed stats */}
          {expandedPlayers[player.id] && (
            <motion.div initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 pt-3 border-t border-base-300">
              {/* Detailed stats */}
            </motion.div>
          )}
        </div>
      </motion.div>
    ))}
  </div>
</div>
```

### Mobile Sorting Interface
A special grid-based sorting interface for mobile devices provides access to all sorting options:

```tsx
<div className="grid grid-cols-3 gap-1">
  {/* Sorting option buttons, highlighted when active */}
  <button 
    className={`py-1 px-2 text-xs rounded ${sortColumn === 'caps' ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
    onClick={() => handleSort('caps')}
  >
    Caps
  </button>
  {/* Other sorting options... */}
</div>
```

## Styling and UI
The component uses a combination of:
- Tailwind CSS for layout and responsive design
- Daisy UI for component styling (cards, tables, buttons, etc.)
- Custom CSS for specific visual elements
- Framer Motion for animations and transitions

The UI has been designed with these principles:
- Clean, information-dense layout on desktop
- Touch-friendly, expandable cards on mobile
- Consistent visual components across device sizes
- Animated transitions for a polished user experience

## Performance Considerations
- Uses `useMemo` for expensive operations like filtering and sorting
- Implements efficient rendering with proper React patterns
- Conditionally renders desktop or mobile view based on screen width
- Uses responsive Tailwind classes for layout adjustments instead of JS calculations
- Optimized expandable cards that only render detailed content when expanded
- Caches data to prevent unnecessary re-fetching
- Uses React refs to maintain state between renders without triggering re-renders
- Smart loading logic that preserves existing data while fetching new data
- Avoids layout shifts with consistent sizing and placeholder states

## Recent Updates

### Mobile Optimizations (May 2025)
- Added responsive card-based layout for mobile devices
- Implemented mobile-specific components with optimized sizes and layouts
- Created a touch-friendly sorting interface for mobile users
- Added expand/collapse functionality for detailed player stats on mobile
- Enhanced animation with Framer Motion for smooth transitions

### Data Handling Improvements (May 2025)
- Implemented XP value capping to ensure values are never displayed as negative
- Enhanced error handling and empty state messaging
- Improved data persistence between view changes

### Accessibility Enhancements
- Added ARIA labels to interactive elements
- Improved color contrast for better readability
- Enhanced touch target sizes on mobile devices

### May 2025 Updates
1. **Enhanced Column Structure**: Separated the game statistics into dedicated columns for clearer data presentation:
   - Dedicated Caps column showing total games played
   - Separate Results column showing only games with known outcomes
   - Repositioned Win % column to appear directly after Results for logical grouping
   - Consolidated streak columns into visual representations showing current and max streaks together

2. **Improved Results Visualization**: Updated the GameResultsBar component to:
   - Display outcomes in a logical progression: wins (green), draws (purple), losses (red)
   - Match the legend ordering with the visual bar segments for consistency
   - Focus only on known outcomes for better visual clarity

3. **New Streak Visualization**: Added the StreakBar component to:
   - Show maximum streak length relative to other players in the table
   - Display current streak position with a "You Are Here" marker
   - Use distinct color coding (purple for win streaks, amber/gold for unbeaten streaks)
   - Provide better visual context for streak data comparison
   - Display a special "PB!" indicator when a player is at their personal best

4. **GF/GA Ratio Column**: Added a new column showing:
   - Ratio of Goals For to Goals Against (similar to K/D ratio in FPS games)
   - Color-coded values (green for ratios > 1, red for ratios < 1)
   - Special handling for edge cases (infinity symbol for players who never concede)

5. **Win Percentage Display Fix**: Fixed an issue with win percentages displaying incorrectly (e.g., 4330.0% instead of 43.3%). The formatter now correctly handles percentage values without applying an additional multiplication by 100.

6. **Filtering Logic Improvement**: Changed filtering criteria from minimum 10 caps to minimum 10 games with known outcomes (wins+losses+draws). This ensures players with sufficient game data are displayed, even if some of their games don't have recorded outcomes.

## Known Issues
As of May 2025, the component includes protection against XP value display issues that were previously causing values to disappear or reset to zero. While we've implemented robust safeguards, the underlying data structure might still benefit from further optimization.

## Future Improvements
Potential enhancements for this component:
- Add export functionality (CSV, PDF)
- Implement column visibility toggles
- Add more advanced filtering options
- Enhance mobile view with collapsible sections
- Add data visualization for more metrics
- Further TypeScript improvements to eliminate remaining implicit any types
- Additional optimizations for the data fetching process
