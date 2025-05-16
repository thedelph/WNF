# Game Results Bar

## Overview
The Game Results Bar component provides a visual representation of a player's game outcomes (wins, losses, draws) with color-coded segments. It enhances the ComprehensiveStatsTable by offering an at-a-glance view of player performance beyond just numerical statistics.

## Visual Design
- **Total Caps**: Displays the total number of games played on the left side
- **Color-Coded Results**: Shows win/loss/draw counts on the right with appropriate color coding
- **Proportional Bar**: Represents each result type with a colored segment proportional to its frequency
- **Color Scheme**:
  - Wins: Green
  - Losses: Red
  - Draws: Purple
  - Unknown results: Grey (when applicable)

## Component Structure
The component follows a consistent layout pattern matching other visualization bars in the application:
```tsx
<div className="flex flex-col w-full gap-1">
  {/* Top row: caps count and W/L/D counts */}
  <div className="flex justify-between text-xs">
    <span className="font-semibold">{total} caps</span>
    <div>
      <span className="text-green-600 font-semibold">W: {wins}</span>
      <span className="mx-1">/</span>
      <span className="text-red-600 font-semibold">L: {losses}</span>
      <span className="mx-1">/</span>
      <span className="text-purple-600 font-semibold">D: {draws}</span>
      {/* Display for unknown results if any */}
    </div>
  </div>
  
  {/* The visual bar */}
  <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 flex">
    {/* Colored segments for each result type */}
  </div>
</div>
```

## Props
| Prop Name | Type | Description |
|-----------|------|-------------|
| wins | number | Number of games won |
| losses | number | Number of games lost |
| draws | number | Number of games drawn |
| total | number | Total number of games played (caps) |

## Usage
The GameResultsBar component is used in the ComprehensiveStatsTable to visualize the 'Caps' column data:

```tsx
{ 
  key: 'caps', 
  label: 'Caps', 
  sortable: true,
  tooltip: 'Number of games played, with breakdown of results (W/L/D)',
  formatter: (_, player) => {
    if (!player) return 'N/A';
    
    return <GameResultsBar 
      wins={player.wins || 0}
      losses={player.losses || 0}
      draws={player.draws || 0}
      total={player.caps || 0}
    />;
  }
}
```

## Implementation Details
- The component calculates the percentage of each result type relative to the total games played
- For players with no games, a "No games played" message is displayed
- The component handles any unknown results (when wins+losses+draws < total) and shows them in grey
- Tooltips are provided on each bar segment for additional context on hover

This visual representation provides a more intuitive understanding of a player's performance record and aligns with the other visual elements in the comprehensive stats table.
