# Goals Distribution Bar

## Overview
The Goals Distribution Bar component provides a visual representation of a player's goals, showing the distribution between goals for (scored) and goals against (conceded). This component is designed to work with the Comprehensive Stats Table to provide immediate visual insights into a player's offensive and defensive contributions.

## Features
- Clear visual representation of goals for vs goals against
- Color-coded bars (green for goals for, red for goals against)
- Responsive design that automatically adjusts to container width
- Support for different visualization modes
- Smooth animations with Tailwind transitions

## Component Structure
The component is implemented in `src/components/stats/GoalsDistributionBar.tsx` and can be used independently or as part of other stat displays.

## Usage
The component can be used in two different modes:

### For-Against Mode (Default)
This mode displays goals for and goals against side by side, showing the relative distribution between them:

```tsx
<GoalsDistributionBar 
  goalsFor={player.goalsFor}
  goalsAgainst={player.goalsAgainst}
  goalDifferential={player.goalDifferential}
  mode="for-against" // This is the default mode
/>
```

### Differential Mode
This mode displays a single bar representing the goal differential, showing positive values (green) to the right and negative values (red) to the left of a center point:

```tsx
<GoalsDistributionBar 
  goalsFor={player.goalsFor}
  goalsAgainst={player.goalsAgainst}
  goalDifferential={player.goalDifferential}
  mode="differential"
  maxValue={20} // Optional maximum scale value
/>
```

## Props Interface
The component accepts the following props:

```tsx
{
  goalsFor: number;           // Number of goals scored
  goalsAgainst: number;       // Number of goals conceded
  goalDifferential: number;   // Difference between goals for and against
  mode?: 'for-against' | 'differential'; // Visualization mode (defaults to 'for-against')
  maxValue?: number;          // Optional maximum scale value for differential mode
}
```

## Implementation Details

### For-Against Mode
In this mode, the component:
1. Calculates the total goals (goalsFor + goalsAgainst)
2. Determines the percentage of each (goalsFor and goalsAgainst) relative to the total
3. Renders a two-segment bar where each segment's width corresponds to its percentage
4. Shows the actual values above each segment

### Differential Mode
In this mode, the component:
1. Uses a centered bar with a middle divider
2. For positive differentials, extends a green bar to the right
3. For negative differentials, extends a red bar to the left
4. The length of the bar is proportional to the magnitude of the differential
5. Shows the differential value above the bar

## Integration with ComprehensiveStatsTable
The GoalsDistributionBar is used in the ComprehensiveStatsTable component to replace the separate GF (Goals For) and GA (Goals Against) columns with a single visual column. This column can be sorted by clicking its header, cycling through all combinations of metrics (GF/GA) and directions (ascending/descending).

## Styling
The component uses Tailwind CSS for styling:
- Flex layouts for proper alignment
- Border and rounded corners for a polished look
- Text styling with appropriate colors and weights
- Transition effects for smooth width changes

## Future Improvements
Potential enhancements for this component:
- Option to display goal ratio instead of raw numbers
- Additional visualization modes
- Customizable colors via props
- Hover tooltips with additional statistics
- Animation or pulse effects for highlighting significant differentials
