# Team Balancing Algorithm Documentation

## Overview

The Team Balancing algorithm creates optimally balanced Blue and Orange teams based on player attack and defense ratings. It provides both automated team assignments and interactive team management.

## Key Features

- **Optimal Team Generation**: Finds the most balanced team arrangement using attack and defense ratings
- **Interactive Team Management**: Visual interface for manual player swapping between teams
- **Smart Swap Recommendations**: Suggests player swaps to improve team balance
- **Balance Scoring**: Quantifies team balance using a numerical score (lower is better)
- **Preview Functionality**: Visualize the impact of potential player swaps before committing to changes

## Technical Implementation

### Balance Score

The balance score is calculated as:
```
score = |blueTeamAttack - orangeTeamAttack| + |blueTeamDefense - orangeTeamDefense|
```

A perfectly balanced team would have a score of 0.

### Algorithm Steps

1. **Team Generation**: Uses binary enumeration to evaluate all possible team combinations
2. **Optimization**: Selects the combination with the lowest balance score
3. **Swap Analysis**: Calculates potential balance improvements from player swaps
4. **UI Rendering**: Displays teams, stats, and swap recommendations

### Algorithm Details

#### Combination Generation

The algorithm uses a binary enumeration approach to generate all possible team combinations:
- Uses binary counting (0 to 2^n - 1) to generate all possible team assignments
- Each bit position (0 or 1) determines a player's team assignment
- Only considers combinations where team sizes differ by at most 1 player

This is implemented in `generateTeamCombinations()` function in `teamBalanceUtils.ts`.

#### Finding Optimal Teams

The `findOptimalTeamBalance()` function evaluates all combinations and selects the one with the lowest balance score. This approach guarantees finding the optimal solution, though it has exponential time complexity (O(2^n)).

#### Calculating Best Swaps

When a player is selected, the `calculateBestSwaps()` function:
- Simulates swapping the selected player with each player on the opposite team
- Calculates the new balance score for each potential swap
- Ranks the swaps by their resulting score (lower is better)
- Returns the top 3 swap candidates

## Preview Functionality

The team balancing interface includes a powerful preview system that allows administrators to:

1. Select players to preview potential swaps
2. See the impact on team balance metrics in real-time
3. Execute or cancel the swap based on the preview results

For detailed information about the preview system, see [PlayerSwapPreview.md](./PlayerSwapPreview.md).

## Win Rate Integration

The team balancing system takes into account both overall and recent win rates:

- **Overall Win Rate**: Historical performance across all games
- **Recent Form**: Performance in the last 10 games
- **Form Indicators**: Visual indicators showing if a player's recent form is better or worse than their overall performance

This integration helps create more balanced teams by considering both long-term skill and current form. For more details on the win rate system, see [WinRateExplainer.md](./WinRateExplainer.md).

## User Interface Components

The Team Balancing interface provides:

1. **Team Stats Display**:
   - Shows total and average attack/defense ratings for each team
   - Displays current balance score

2. **Recommended Swaps**:
   - If a better team balance is possible, shows recommended swaps
   - For each swap, shows balance improvement score and player details
   - "Make This Swap" buttons to execute recommended swaps

3. **Interactive Swapping**:
   - Click on one player, then another to swap them
   - Visual indicators show best swap candidates when a player is selected
   - Error handling for invalid swaps (e.g., same team)

4. **Data Refresh**:
   - Button to refresh team data from the backend

## Usage Guidelines

- **Team Size**: Teams should have equal numbers of players (or differ by at most 1)
- **Manual Adjustments**: Use recommended swaps or manual swapping when team composition needs adjustment
- **Data Refresh**: Use the "Refresh Team Data" button to update player ratings from the database

## Performance Considerations

The algorithm evaluates 2^n possible team combinations, where n is the number of players. This approach works well for typical team sizes (up to ~20 players), but could become slow for larger player counts.

## Future Improvements

Potential enhancements to consider:
- Implement heuristic methods for larger player pools
- Add position-based balancing (ensuring each team has proper role distribution)
- Add player skill compatibility scoring (synergies between players)
