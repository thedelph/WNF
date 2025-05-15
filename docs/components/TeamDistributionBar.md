# Team Distribution Bar Component

## Overview
The Team Distribution Bar is a visual component that displays the percentage of games a player has participated in on blue vs. orange teams. It provides an intuitive, visual representation of team distribution using a horizontal bar with proportional colored segments.

## Features
- Color-coded visual representation (blue/orange) of team distribution percentages
- Text labels showing exact percentages for both teams
- Responsive design that works in both desktop and mobile views
- Handles edge cases where a player has only played on one team
- Tooltips with additional information

## Technical Implementation
The feature consists of two main components:

1. **TeamDistributionBar.tsx**: A reusable component for rendering the distribution bar
2. **Updated ComprehensiveStatsTable.tsx**: Integration of the bar into the comprehensive player stats table

### TeamDistributionBar Component
This component takes blue and orange team percentages as input and renders:
- A container with percentage labels at the top
- A horizontal bar with proportionally sized blue and orange segments

```tsx
export const TeamDistributionBar = ({ 
  bluePercentage, 
  orangePercentage 
}: { 
  bluePercentage: number, 
  orangePercentage: number 
}) => {
  return (
    <div className="flex flex-col w-full gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-blue-600 font-semibold">{bluePercentage.toFixed(1)}%</span>
        <span className="text-orange-500 font-semibold">{orangePercentage.toFixed(1)}%</span>
      </div>
      <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 flex">
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
};
```

### Integration with Comprehensive Stats Table
The team distribution bar is integrated into the ComprehensiveStatsTable by:
1. Replacing the separate "Blue Team %" and "Orange Team %" columns with a single "Team Colors" column
2. Using a formatter function that calculates missing percentages (ensuring they add up to 100%)
3. Adding sorting functionality by blue team percentage

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
    
    // If we have only one percentage, calculate the other
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

## Data Source
The team percentages are calculated in the database using the following SQL in the `get_comprehensive_player_stats` function:

```sql
-- Blue team percentage
ROUND(
  COUNT(*) FILTER (WHERE gr.team = 'blue')::numeric / 
  NULLIF(COUNT(*), 0) * 100,
  1
) AS blue_percentage,
-- Orange team percentage
ROUND(
  COUNT(*) FILTER (WHERE gr.team = 'orange')::numeric / 
  NULLIF(COUNT(*), 0) * 100,
  1
) AS orange_percentage
```

## Edge Cases and Considerations
- Players with 0 caps: Displays "N/A" instead of a bar
- Single team players: Calculates the other percentage to ensure 100% total
- Null values: Handles null database values by defaulting to 0
- Responsive design: Works on all screen sizes
- Sorting: Allows sorting by team distribution (blue percentage)

## Future Improvements
Potential enhancements for this component:
- Add player stats tooltip on hover with more detailed team performance
- Include win percentage by team color
- Add animation for data changes
- Consider additional accessibility features (aria labels, etc.)
- Provide filtering options for players based on team color preferences
