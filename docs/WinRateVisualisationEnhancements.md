# Win Rate Visualisation Enhancements

## Overview

This document explains the visual enhancements to the win rate graph that help players understand why certain games are included or excluded from the official win rate calculation.

## Background

In WNF, win rates are calculated based on strict criteria:
- Only games with even teams (equal number of players on both sides)
- Only games with clear outcomes (win, loss, or draw)
- Only games where the player was selected to play (not reserves)

However, players were confused when viewing their win rate history graph as it wasn't clear which games were being counted in the calculation. For example, a player's first game might show as a loss on the graph but not affect their win rate if the teams were uneven.

## Visual Indicators

The enhanced win rate graph now includes the following features:

1. **Excluded Game Indicators**:
   - Games excluded from win rate calculations are shown with a **dashed border**
   - The most common reasons for exclusion are uneven teams or unknown outcomes
   - Regular games (included in calculation) have a solid border

2. **Enhanced Tooltips**:
   - Hovering over any game shows detailed information
   - For excluded games, the tooltip explains why the game doesn't count toward the win rate
   - Shows game details including date, outcome, and current win rate

3. **Summary Statistics**:
   - A summary below the graph shows how many games are included vs excluded
   - Provides counts for different exclusion reasons (uneven teams, unknown outcomes)
   - Helps players understand the proportion of their games that count toward their official win rate

4. **Explanatory Text**:
   - Clear documentation explains the win rate calculation rules
   - Links to full documentation for players who want more details

## Implementation Details

- Uses Recharts' custom shape renderer to add dashed borders to excluded games
- Tracks game statistics to show inclusion/exclusion summaries
- UK-formatted dates in tooltips (day month year)
- Timezone-aware date formatting to handle BST/GMT changes correctly

## Benefits

- **Transparency**: Players can see exactly which games count towards their win rate
- **Understanding**: Clarifies why a player's win rate might not match their perceived performance
- **Consistency**: Visual representation matches the database calculation
- **Context**: Players can distinguish between all games played and those that affect their statistics

## Related Documentation

For more information, see:
- [WinRateExplainer.md](./WinRateExplainer.md) - Full explanation of win rate calculation
- [WinRateGraph.md](./components/WinRateGraph.md) - Technical details of the graph component
