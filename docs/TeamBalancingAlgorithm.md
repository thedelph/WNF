# Team Balancing Algorithm Documentation

## Overview

The WNF team balancing system uses a sophisticated algorithm to create fair and competitive teams. It considers multiple player metrics and handles both experienced players and newcomers intelligently.

## Key Features

### 1. Five-Metric Balancing
The algorithm considers five key metrics, each weighted equally at 20%:
- **Attack Rating** (0-10): Offensive capabilities
- **Defense Rating** (0-10): Defensive capabilities  
- **Game IQ Rating** (0-10): Tactical awareness and decision-making
- **Win Rate** (%): Recent performance (last 10 games)
- **Goal Differential**: Average goal difference (last 10 games)

### 2. Unknown Player Handling
Players with fewer than 10 games are considered "unknown" because they lack sufficient data for win rate and goal differential calculations.

#### Visual Indicators
- **"NEW" badge**: Displayed next to players with <10 games
- **Team headers**: Show count of new players (e.g., "Blue Team (8 players, 3 new)")
- **Confidence score**: Indicates reliability of team balance

#### Confidence Levels
- 🟢 **High confidence**: <25% unknown players
- 🟡 **Medium confidence**: 25-50% unknown players
- 🔴 **Low confidence**: >50% unknown players

## Technical Implementation

### Balance Score

The balance score for experienced players (all 5 metrics):
```
Score = (AttackDiff × 0.20) + (DefenseDiff × 0.20) + (GameIQDiff × 0.20) + 
        (WinRateDiff × 0.20) + (GoalDiffDiff × 0.20)
```

For unknown players (3 metrics only):
```
Score = (AttackDiff + DefenseDiff + GameIQDiff) / 3
```

Lower scores indicate better balance.

### Two-Phase Optimization Algorithm

#### Phase 1: Optimal Unknown Distribution
1. **Separation**: Players are separated into unknown (<10 games) and experienced (≥10 games) groups
2. **Target Distribution**: Calculates how many unknowns should go to each team (e.g., 5 unknowns → 2 blue, 3 orange)
3. **Combination Generation**: Uses `generateCombinationsOfSize()` to create all possible distributions
4. **Evaluation**: Each distribution is scored using `calculatePartialBalanceScore()` (Attack/Defense/Game IQ only)
5. **Selection**: The distribution with the minimum score is selected

#### Phase 2: Experienced Player Optimization
1. **Pre-assigned Unknowns**: Unknown players are already optimally distributed from Phase 1
2. **Combination Generation**: Uses `generateTeamCombinations()` for all possible experienced player arrangements
3. **Full Evaluation**: Each combination is scored using all 5 metrics via `calculateBalanceScore()`
4. **Final Selection**: The combination with the lowest overall score is selected

### Key Functions

```typescript
// Check if a player is unknown (< 10 games)
isUnknownPlayer(player: TeamAssignment): boolean

// Find optimal distribution of unknown players
findOptimalUnknownDistribution(unknownPlayers: TeamAssignment[], targetBlueCount: number)

// Calculate balance score for Attack/Defense/Game IQ only
calculatePartialBalanceScore(team1: TeamAssignment[], team2: TeamAssignment[]): number

// Main algorithm entry point
findOptimalTeamBalance(players: TeamAssignment[]): TeamBalance
```

### Deterministic Results
The algorithm is completely deterministic:
- Same input always produces the same output
- No randomization involved
- Results are predictable and explainable

### Swap Recommendations

When a player is selected, the `calculateBestSwaps()` function:
- Simulates swapping the selected player with each player on the opposite team
- Calculates the new balance score for each potential swap
- Considers both immediate metric improvements and overall balance
- Returns swaps ranked by total improvement, with focus on specific metrics if selected

## Preview Functionality

The team balancing interface includes a powerful preview system that allows administrators to:

1. Select players to preview potential swaps
2. See the impact on team balance metrics in real-time
3. Execute or cancel the swap based on the preview results

For detailed information about the preview system, see [PlayerSwapPreview.md](./PlayerSwapPreview.md).

## Usage in Admin Interface

### Generate Optimal Teams
1. Click "Generate Optimal Teams" button
2. Algorithm runs automatically
3. Results display with:
   - Team summaries showing average stats
   - Player lists with ratings and indicators
   - Confidence score
   - Balance score

### Manual Adjustments
After generation, admins can:
- Manually swap players if needed
- View swap recommendations with improvement scores
- Focus on specific metrics (Attack, Defense, Game IQ, Win Rate, Goal Differential)
- See impact of each potential swap

## Edge Cases

### All Unknown Players
- Algorithm still works by optimizing Attack/Defense/Game IQ
- Confidence will show as "Low"
- Teams will be as balanced as possible given available data

### Similar Stats
- When players have very similar stats, multiple distributions may be equally optimal
- Algorithm consistently picks the first valid option (deterministic)

### Uneven Player Count
- Algorithm handles odd numbers gracefully
- One team may have one more player
- Balance calculation accounts for different team sizes

## Performance Considerations

### Computational Complexity
- For n players: O(2^n) combinations to evaluate
- Optimization: Separate handling of unknowns reduces search space
- Practical limit: ~20 players before noticeable delay

### Optimization Strategies
1. Pre-filtering invalid combinations (team size constraints)
2. Early termination when perfect balance found
3. Caching repeated calculations

## Troubleshooting

### Common Issues

**"Teams seem unbalanced despite good scores"**
- Check if many players are "unknown" (low confidence)
- Verify all player ratings are up to date
- Consider manual adjustments for edge cases

**"Same players always together"**
- This is expected behavior (deterministic)
- Use manual swaps to vary teams if desired
- Future chemistry features will address this

**"Algorithm is slow"**
- Reduce number of players if possible
- Check for performance issues in browser
- Contact support if consistently slow

## Best Practices

1. **Keep ratings updated**: Regularly update player ratings for accuracy
2. **Monitor confidence**: Be cautious with low confidence results
3. **Use manual adjustments**: Algorithm provides a starting point
4. **Consider context**: Account for factors the algorithm doesn't know
5. **Gather feedback**: Track actual game results to improve ratings

## Future Improvements

Potential enhancements to consider:
- **Position-based balancing**: Consider player positions
- **Chemistry factors**: Account for players who work well together
- **Fatigue tracking**: Consider recent game participation
- **Historical performance**: Weight recent games more heavily
- **Custom weights**: Allow admins to adjust metric importance
