# Player Statistics Features Overview

## Introduction
The WNF application includes comprehensive player statistics tracking that helps players and admins understand performance metrics across various dimensions. This document provides an overview of the different stats features available in the system.

## Key Statistics Features

### 1. Comprehensive Player Stats
A complete view of all player statistics in a searchable, sortable table. See [ComprehensiveStatsTable.md](./components/ComprehensiveStatsTable.md) for details.

Key metrics include:
- XP (Experience points)
- Caps (Games played)
- Goals For/Against and Goal Differential
- Win Percentage
- Win and Unbeaten Streaks
- Visual Team Distribution (blue/orange team percentages)

### 2. Team Distribution Visualization
A visual representation of players' distribution between blue and orange teams, shown as a horizontal bar chart. See [TeamDistributionBar.md](./components/TeamDistributionBar.md) for implementation details.

### 3. Win Rate Tracking
The system tracks player win rates and provides visualization through:
- Win percentage in stats tables
- Win rate over time graphs
- Team-specific win rates

See [WinRateExplainer.md](./WinRateExplainer.md) for more information.

### 4. Winning Streaks
Tracking of consecutive wins and unbeaten streaks. See [WinningStreaksFeature.md](./WinningStreaksFeature.md) and [UnbeatenStreaksFeature.md](./UnbeatenStreaksFeature.md) for details.

### 5. Goal Differential
Tracking of goals scored vs. conceded while a player is on the pitch. See [GoalDifferentialFeature.md](./GoalDifferentialFeature.md) for more information.

### 6. XP System
A tiered XP system that rewards player participation, win rates, and other factors. See [XPSystemExplained.md](./XPSystemExplained.md) and [TieredXPSystemDesign.md](./TieredXPSystemDesign.md) for details.

## Stats Display Components

The application includes several components for displaying statistics:
- [ComprehensiveStatsTable](./components/ComprehensiveStatsTable.md): Complete player stats table
- [TeamDistributionBar](./components/TeamDistributionBar.md): Visual Team Colours distribution
- [StatsGrid](./components/StatsGrid.md): Grid layout for various player stats
- [WinRateGraph](./components/WinRateGraph.md): Visual representation of win rate over time
- [PlayerCard](./components/PlayerCard.md): Individual player stat cards
- [XPBreakdown](./components/XPBreakdown.md): Detailed breakdown of player XP sources

## Database Structure

Player statistics are stored and calculated through several database tables and views:
- `games`: Core game data
- `game_registrations`: Player participation records
- `players`: Core player data
- Player stats views and functions: Various database functions calculate statistics

For more information on database functions related to player stats, see [DatabaseFunctions.md](./DatabaseFunctions.md).

## Known Issues and Future Development

As of May 2025, there are known data quality issues with some statistics. These are being addressed and are marked with a warning banner on the stats page.

Planned improvements include:
- Enhanced data quality and validation
- More visual representations of player statistics
- Advanced filtering and comparison tools
- Export functionality for statistics
- Integration with team balancing algorithms

## Related Documentation
- [TeamBalancingAlgorithm.md](./TeamBalancingAlgorithm.md)
- [PlayerProfileMultipleMatchesFix.md](./PlayerProfileMultipleMatchesFix.md)
- [StatsPageDatabaseFix.md](./fixes/StatsPageDatabaseFix.md)
- [StatsMedalStandardization.md](./components/StatsMedalStandardization.md)
