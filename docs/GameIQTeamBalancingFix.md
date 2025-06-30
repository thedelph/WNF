# Game IQ Team Balancing Fix

## Date: June 30, 2025

## Overview
Fixed critical issues where Game IQ ratings were not being properly fetched from the database or displayed in the team balancing interface. All players were showing Game IQ as "5" instead of their actual values.

## Issues Identified

### 1. Database Query Missing Game IQ
The `useTeamBalancing` hook was not including `game_iq` or `average_game_iq_rating` in its database query.

### 2. UI Components Not Displaying Game IQ
- OptimalTeamGenerator didn't show Game IQ in team summaries
- SwapSuggestion component didn't display Game IQ improvements
- Team stats calculations didn't include Game IQ averages

### 3. Default Values Instead of Actual Data
All players were showing Game IQ rating of 5 (the default) instead of their actual database values.

## Changes Made

### 1. useTeamBalancing.ts
- Added `game_iq` and `average_game_iq_rating` to the players select query
- Updated all game_iq_rating assignments to use null-safe operators (`??`)
- Added Game IQ calculations to team stats (avgGameIq, totalGameIq)
- Updated avgRating calculation to include Game IQ (now uses 3 metrics instead of 2)

### 2. OptimalTeamGenerator.tsx
- Added formatRating import for proper null handling
- Added "Avg Game IQ" display in both team summaries
- Updated player tooltips to show format: "A: X, D: Y, IQ: Z"

### 3. SwapSuggestion.tsx
- Added Game IQ improvement display with purple color scheme
- Shows star (★) when Game IQ is the primary impact metric

### 4. Type Definitions
- Updated TeamAssignment interface to allow null values for all rating fields
- Updated PlayerRating interface in teamBalancing.ts to handle nulls

### 5. Team Balancing Utilities
- Updated calculateTeamStats to use null-safe operators
- Fixed team balance calculations to properly handle null Game IQ values

## Technical Details

### Null-Safe Operators
All rating calculations now use nullish coalescing (`??`) instead of logical OR (`||`) to properly handle 0 values:
```typescript
// Before
game_iq_rating: player.game_iq || 5

// After
game_iq_rating: player.game_iq ?? player.average_game_iq_rating ?? 5
```

### Database Values Verified
Using Supabase MCP, confirmed actual Game IQ values in database:
- Range from 3.67 to 8.67 (not all 5)
- Some players have null values (unrated)

### Display Formatting
All components now use `formatRating()` utility which:
- Shows actual rating value with 1 decimal place
- Displays "unrated" for null values
- Provides consistent formatting across the application

## Impact
- Team balancing algorithm now properly considers actual Game IQ ratings
- Optimal team generation includes Game IQ in calculations
- Swap recommendations factor in Game IQ improvements
- All displays show accurate Game IQ values from the database

## Testing Recommendations
1. Verify Game IQ displays correctly for all players in team balancing
2. Check that "unrated" appears for players without Game IQ ratings
3. Confirm optimal team generation considers Game IQ
4. Test swap recommendations show Game IQ improvements
5. Ensure null values don't cause runtime errors

---

# Team Balancing Enhancement: Unknown Player Distribution

## Date: June 30, 2025 (Additional Enhancement)

## Problem
When using the "Generate Optimal Teams" feature, players with unknown stats (less than 10 games played) were sometimes clustered on one team. This created significant risk of unbalanced games since:
- Win rate and goal differential metrics couldn't be calculated for these players
- The algorithm effectively reduced from 5 balancing metrics to only 3 (Attack, Defense, Game IQ)
- All the uncertainty was concentrated on one team

## Solution
Implemented a two-phase team generation algorithm:

### Phase 1: Distribute Unknown Players
- Identifies players with < 10 games (no win rate/goal differential data)
- Distributes these players evenly across both teams
- Ensures both teams have similar uncertainty levels

### Phase 2: Optimize Experienced Players
- With unknowns pre-distributed, runs optimization on experienced players
- All 5 metrics can now contribute to balancing
- Results in more predictable and balanced games

## UI Enhancements

### Visual Indicators
- Players with < 10 games show a "NEW" badge
- Team headers show count of new players (e.g., "Blue Team (8 players, 3 new)")
- Tooltips explain limited stats availability

### Confidence Score
The system now displays a confidence level based on the percentage of unknown players:
- **High confidence** (green): < 25% unknown players
- **Medium confidence** (yellow): 25-50% unknown players  
- **Low confidence** (red): > 50% unknown players

## Technical Implementation

### New Helper Function
```typescript
export const isUnknownPlayer = (player: TeamAssignment): boolean => {
    return player.total_games === null || 
           player.total_games === undefined || 
           player.total_games < 10;
};
```

### Modified Algorithm
The `findOptimalTeamBalance` function now:
1. Separates players into unknown and experienced groups
2. Distributes unknowns evenly (with randomization)
3. Optimizes experienced player distribution
4. Combines both groups for final teams

## Benefits
- More consistent game balance when new players are involved
- Reduced risk of one team having all the "wildcards"
- Better use of all 5 balancing metrics
- Clear visibility of team composition uncertainty
- Improved decision-making for admins

---

# Team Balancing Enhancement: Deterministic Unknown Distribution

## Date: June 30, 2025 (Second Enhancement)

## Problem with Previous Solution
The initial unknown player distribution used randomization, resulting in:
- Different team configurations each time "Generate Optimal Teams" was clicked
- Not considering the Attack/Defense/Game IQ stats of unknown players
- Suboptimal balance of the stats we do have

## Improved Solution
Implemented deterministic optimal distribution of unknown players:

### Phase 1: Optimal Unknown Distribution
- Generates ALL possible ways to split unknowns between teams
- Evaluates each split based on Attack/Defense/Game IQ balance
- Selects the split that minimizes differences in these three metrics
- Completely deterministic - same input always produces same output

### Phase 2: Optimize Experienced Players
- With unknowns optimally pre-distributed, optimizes experienced player placement
- Considers all 5 metrics for experienced players

## Technical Implementation

### New Helper Functions
```typescript
// Generate all combinations of specific size
const generateCombinationsOfSize = (players: TeamAssignment[], size: number): TeamAssignment[][]

// Calculate balance for Attack/Defense/Game IQ only
const calculatePartialBalanceScore = (team1: TeamAssignment[], team2: TeamAssignment[]): number

// Find optimal distribution of unknowns
const findOptimalUnknownDistribution = (unknownPlayers: TeamAssignment[], targetBlueCount: number)
```

### Algorithm Flow
1. Separate players into unknown (<10 games) and experienced (≥10 games)
2. Calculate target split (e.g., 5 unknowns → 2 blue, 3 orange)
3. Try all possible combinations of that split
4. Score each based on Attack/Defense/Game IQ balance
5. Use the best distribution for phase 2

## Results
- **Deterministic**: Same configuration every time
- **Optimal**: Unknown players distributed to maximize balance
- **Comprehensive**: All available data is utilized
- **Predictable**: Admins get consistent, explainable results

## Example
With 5 unknown players:
- System tries all 10 ways to assign 2 to blue, 3 to orange
- Evaluates Attack/Defense/Game IQ balance for each
- Picks the distribution with smallest stat differences
- Result: Same optimal distribution every time