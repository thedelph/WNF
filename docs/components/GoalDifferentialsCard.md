# Goal Differentials Card

## Overview
The Goal Differentials Card displays team goal statistics for players with a focus on their goal scoring and conceding efficiency. It ranks players by their GF/GA ratio (Goals For / Goals Against), showing the top 10 performers with detailed statistics.

## Features

### Core Features
- Displays the top 10 players sorted by GF/GA ratio
- Shows comprehensive goal statistics: Caps, Goals For (GF), Goals Against (GA), Goal Differential (+/-), and GF/GA ratio
- Handles edge cases like players who have never conceded a goal (shows infinity symbol)
- Provides visual differentiation with color-coding
- Awards medals to top 3 performers
- Only shows players with 10+ caps

### Visual Elements
- Color-coded metrics:
  - Goals For: Green
  - Goals Against: Red
  - Goal Differential: Green (positive), Red (negative), Neutral (zero)
  - GF/GA Ratio: Green (≥ 1), Red (< 1), Gold/Warning (infinity)
- Tooltips providing explanations for metrics
- Medal emojis for top 3 performers (🥇, 🥈, 🥉)
- Attractive gradient background with animations

## Technical Implementation

### Data Handling
```tsx
// Sort by GF/GA ratio instead of goal differential
const sortedPlayers = [...goalDifferentials].sort((a, b) => {
  // Handle cases where goalsAgainst is 0 (infinity ratio)
  if (a.goalsAgainst === 0 && b.goalsAgainst === 0) {
    // If both have 0 goals against, sort by goals for (higher is better)
    return b.goalsFor - a.goalsFor;
  } else if (a.goalsAgainst === 0) {
    // If only a has 0 goals against, it comes first
    return -1;
  } else if (b.goalsAgainst === 0) {
    // If only b has 0 goals against, it comes first
    return 1;
  }
  
  // Normal case: Sort by GF/GA ratio
  const aRatio = a.goalsFor / a.goalsAgainst;
  const bRatio = b.goalsFor / b.goalsAgainst;
  return bRatio - aRatio;
});
```

### Layout Structure
The component uses a carefully structured grid layout to ensure perfect column alignment:

```tsx
<div className="grid grid-cols-5 gap-2 w-60">
  <div className="text-center">Caps</div>
  <div className="text-center">GF</div>
  <div className="text-center">GA</div>
  <div className="text-center">+/-</div>
  <div className="text-center relative">
    <span>GF/GA</span>
    <Tooltip content="Ratio of Goals For to Goals Against">
      <span className="cursor-help text-info absolute -right-2 -top-1 text-xs">ⓘ</span>
    </Tooltip>
  </div>
</div>
```

### GF/GA Ratio Display
The component uses special handling for the GF/GA ratio to properly display it with appropriate formatting and color-coding:

```tsx
<div className={`text-center font-semibold ${player.goalsAgainst === 0 ? 'text-warning' : (player.goalsFor / player.goalsAgainst) >= 1 ? 'text-success' : 'text-error'}`}>
  {player.goalsAgainst === 0 
    ? '∞' 
    : (player.goalsFor / player.goalsAgainst).toFixed(1)}
</div>
```

## Animation
The component uses Framer Motion for smooth animations:
- Card entrance animation with a slide-up effect
- Staggered animation for player rows for a cascade effect

## Integration
The component is integrated into the PerformanceStats component and displayed on the Stats page in the Performance tab.

## Recent Updates

### May 2025 Updates
1. **Added GF/GA Ratio**: Added a new column showing the ratio of goals scored to goals conceded, providing a more comprehensive view of player efficiency.
2. **Updated Sorting Logic**: Changed the sorting to rank players by GF/GA ratio instead of goal differential, highlighting players with better scoring efficiency.
3. **Enhanced Tooltips**: Added tooltips to provide context for the GF/GA ratio metric.
4. **Updated Description**: Updated the description to reflect the new sorting criteria.

## Best Practices
- Always ensure the component receives valid player statistics to avoid division by zero errors
- Keep column sizes and spacing consistent for visual alignment
- Use color-coding consistently across the application for similar metrics
