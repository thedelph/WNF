# StreakBar Component

## Overview
The StreakBar component provides a visual representation of a player's current streak relative to their maximum streak. It displays a bar that represents the maximum streak with a marker indicating the current streak position, creating a "You Are Here" effect. This component is used to visualize win streaks and unbeaten streaks in the ComprehensiveStatsTable.

## Features
- Visual bar representing maximum streak length
- Position marker showing current streak relative to personal best
- Special "PB!" indicator that appears when player is currently at their personal best
- Animation effects that pulse when at personal best
- Relative scaling based on the highest streak values in the table
- Distinct color coding: purple for win streaks, amber/gold for unbeaten streaks
- Visual legend explaining the elements of the bar
- Shadow effects to make the current streak marker stand out
- Responsive design that works in table cells

## Component Structure
The StreakBar component is a standalone visual component located at:
```
src/components/stats/StreakBar.tsx
```

## Props
The component accepts the following props:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| currentStreak | number | Yes | The player's current streak value |
| maxStreak | number | Yes | The player's maximum/longest streak value |
| label | string | No | Label indicating the type of streak ("Win" or "Unbeaten"). Default: "Win" |
| tableMax | number | No | The maximum streak value across all players in the table (for relative scaling). Default: 0 |

## Usage

### Basic Usage
```tsx
<StreakBar 
  currentStreak={3}
  maxStreak={7}
  label="Win"
  tableMax={10}
/>
```

### Within the ComprehensiveStatsTable
```tsx
// Win streak column
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

// Unbeaten streak column
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
}
```

## Visual Design
The StreakBar uses the following visual elements:

1. **Maximum Streak Bar**: A horizontal bar representing the player's maximum streak, displayed in:
   - Purple (`bg-purple-500`) for win streaks
   - Amber/gold (`bg-amber-500`) for unbeaten streaks
   
2. **Current Streak Marker**: A vertical marker showing the current streak position:
   - Deeper purple (`bg-purple-700`) for win streaks
   - Deeper amber (`bg-amber-700`) for unbeaten streaks
   - Enhanced with subtle shadow effects
   - Positioned relative to the maximum streak
   - Grows wider and pulses when at personal best
   
3. **Personal Best Indicator**: A special "PB!" badge that appears when current streak equals maximum streak:
   - Appears in the left side of the component
   - Uses accent color with pulsing animation
   - Makes it immediately obvious when a player is at their personal best
   
4. **Visual Legend**: A small legend below the bar explaining:
   - Maximum streak representation (color-matched bar)
   - Current streak representation (color-matched marker)

5. **Text Information**: Displays numeric values:
   - Current streak value
   - Maximum streak value

## Relative Scaling
The component scales the maximum streak bar based on the highest streak in the table:

```tsx
// Calculate width percentage of max streak relative to the highest in the table
const maxStreakPercentage = (maxStreak / actualMax) * 100;

// Calculate the relative position of current streak within max streak
const currentPositionPercentage = currentStreak > 0 
  ? Math.min((currentStreak / maxStreak) * maxStreakPercentage, maxStreakPercentage) 
  : 0;
```

This ensures that all player streak bars are on the same visual scale, making it easier to compare across players.

## Edge Cases and Error Handling
The component handles several edge cases:

- **No streak data**: Shows an empty gray bar with "No streak data" text
- **Zero max streak**: Displays an empty bar
- **Current streak greater than max streak**: Caps the current streak marker at the max streak position
- **No tableMax provided**: Falls back to using the player's own maxStreak for scaling

## Technical Implementation
The component uses:
- Tailwind CSS for styling
- Relative positioning for the marker placement
- Z-index to ensure marker appears above the bar
- Shadow effects for visual emphasis of the current streak marker

## Recent Updates

### May 2025 Updates
1. **Initial Implementation**: Created the StreakBar component to replace the separate streak columns in the ComprehensiveStatsTable with a more visual representation.

2. **Color Scheme Update**: Changed from standard green/blue to purple/amber colors for better visual distinction and appeal.

3. **Shadow Effects**: Added subtle shadow effects to make the current streak marker stand out more and provide a "You Are Here" feel.

4. **Personal Best Indicator**: Added a special "PB!" indicator badge and animations that appear when a player is at their personal best (current streak equals maximum streak).

5. **Clean UI Improvements**: Removed redundant streak type labels from each row to reduce duplication of information already shown in column headers.

## Future Improvements
Potential enhancements for this component:
- Add animations when values change
- Implement hover effects with more detailed information
- Support for displaying streak history using small tick marks
- Add accessibility features (ARIA attributes, keyboard navigation)
- Provide optional tooltip showing streak start/end dates
