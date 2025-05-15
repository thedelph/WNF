# Stats Card Medal Standardization

## Overview
This document describes the standardization of medal displays across all statistics cards in the WNF application. The goal was to create a consistent visual language for representing player rankings across different statistical categories.

## Implementation

### Medal Display
- All stats cards now use emoji medals for consistent representation:
  - 🥇 Gold medal: First place
  - 🥈 Silver medal: Second place
  - 🥉 Bronze medal: Third place
- Previous SVG-based medals from Lucide icons were replaced with Unicode emoji medals
- Standardized spacing and alignment ensures consistent visual appearance

### Affected Components
The following components were updated to use the standardized medal display:
- `AwardCard.tsx`: Used for most statistical awards
- `HighestXPCard.tsx`: Used for the XP leaderboard
- `GoalDifferentialsCard.tsx`: Used for the goal differential statistics

### Style Enhancements
- The Goal Differentials card uses an indigo gradient background for better contrast with green/red text
- Consistent spacing between medal and player name across all cards
- Width standardization for better alignment of data across all cards

## Benefits
1. **Visual Consistency**: All rankings across the app now use the same medal representation
2. **Improved Readability**: Better contrast between medals and card backgrounds
3. **Simplified Code**: Removed dependency on SVG icons for medals
4. **Cross-platform Support**: Emoji medals render consistently across different devices

## Examples

### Before Standardization
Previously, stats cards used SVG medal icons with different color styling:
- Gold medal: Yellow SVG icon with drop shadow
- Silver medal: White/silver SVG icon with drop shadow
- Bronze medal: Bronze SVG icon with drop shadow

### After Standardization
Now all stats cards use emoji medals:
- 🥇 First place 
- 🥈 Second place
- 🥉 Third place

## Future Considerations
- Potential accessibility improvements for screen readers
- Consider using custom SVG medals if more specific branding is desired in the future
