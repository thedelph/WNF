# XPBreakdown Component

## Overview
The XPBreakdown component displays a detailed breakdown of a player's XP (Experience Points) from various sources, including game participation, streaks, and reserve status. The streak calculation is based solely on past games and is not affected by future game registrations or team selections.

## Props

```typescript
interface XPBreakdownProps {
  stats: {
    caps: number;
    activeBonuses: number;
    activePenalties: number;
    currentStreak: number;
    gameHistory?: GameHistory[];
    latestSequence?: number;
    xp: number;
    reserveXP?: number;
    reserveCount?: number;
  };
  showTotal?: boolean;
}
```

### Props Description
- `stats`: Object containing all XP-related statistics
  - `caps`: Number of games played
  - `activeBonuses`: Current active XP bonuses
  - `activePenalties`: Current active XP penalties
  - `currentStreak`: Current attendance streak (based on past games only)
  - `gameHistory`: Array of past games and their details
  - `latestSequence`: Most recent game sequence number
  - `xp`: Total XP points
  - `reserveXP`: XP earned/lost from reserve status
  - `reserveCount`: Number of times player has been a reserve
- `showTotal`: Boolean to toggle display of total XP

## XP Weighting System

The XP breakdown uses the following weighting system for games:

| Games Ago    | XP Value |
|--------------|----------|
| Current game | 20 XP    |
| 1-2 games    | 18 XP    |
| 3-4 games    | 16 XP    |
| 5-9 games    | 14 XP    |
| 10-19 games  | 12 XP    |
| 20-29 games  | 10 XP    |
| 30-39 games  | 5 XP     |
| 40+ games    | 0 XP     |

This weighting system ensures that recent participation is valued more highly while still maintaining some value for historical participation up to 39 games ago.

## XP Calculation Details

The XP breakdown shows various components that contribute to a player's total XP:

### Base Game XP
- Weighted based on game recency (see table below)
- Shows individual game contributions
- Raw XP values are summed WITHOUT multipliers
- No rounding is done at this stage

### Reserve XP
- Shows +5 XP for being reserve
- Shows -10 XP for declining slots
- Added to base XP before multipliers are applied

### Multipliers
Both multipliers are applied to the TOTAL (base + reserve) XP at the END:

1. Streak Multiplier
   - Based on consecutive game participation
   - 10% bonus per streak level
   - Formula: 1 + (current_streak * 0.1)
   - Example: Streak of 13 = 1 + (13 * 0.1) = 2.3x multiplier

2. Bench Warmer Multiplier
   - Based on consecutive reserve/non-selection status
   - 5% bonus per bench warmer streak level
   - Formula: 1 + (bench_warmer_streak * 0.05)
   - Example: Bench streak of 2 = 1 + (2 * 0.05) = 1.1x multiplier

### Final Calculation Order
```typescript
// 1. Sum raw base XP (no multipliers)
const baseXP = gameHistory.reduce((total, game) => {
  return total + getBaseXPForGame(game);
}, 0);

// 2. Add reserve XP
const totalBaseXP = baseXP + (reserveXP || 0);

// 3. Calculate multipliers
const streakMultiplier = 1 + (currentStreak * 0.1);
const benchWarmerMultiplier = 1 + (benchWarmerStreak * 0.05);

// 4. Apply multipliers and round at the end
const finalXP = Math.round(totalBaseXP * streakMultiplier * benchWarmerMultiplier);
```

### Example Calculation
```
Base XP from games:
- Most recent (0 ago): 20
- 1-2 games ago: 18 × 2 = 36
- 3-4 games ago: 16 × 2 = 32
- 5-9 games ago: 14 × 5 = 70
- 10-19 games ago: 12 × 10 = 120
- 20-29 games ago: 10 × 7 = 70
Total base = 348

Reserve XP = 0
Combined total = 348

Streak = 13 (2.3x multiplier)
Bench streak = 0 (1.0x multiplier)

Final XP = ROUND(348 * 2.3 * 1.0) = 773
```

### Common Mistakes
1. ❌ Don't apply multipliers to each game individually
2. ❌ Don't round each game's XP before summing
3. ❌ Don't apply multipliers before adding reserve XP

## Features

### Reserve XP Display
- Shows the total Reserve XP earned or lost
- Displays the number of times a player has been a reserve
- Color-coded UI:
  - Green for positive Reserve XP (being a reserve)
  - Red for negative Reserve XP (declining slots)

### Streak Display
- Shows the current streak based on consecutive participation in past games
- Updates only when games are completed, not during registration or team selection
- Color-coded to indicate streak level:
  - Green: Active streak (3+ games)
  - Yellow: Building streak (1-2 games)
  - Gray: No streak (0 games)

### Visual Elements
- Card-based layout for each XP category
- Color-coded sections for easy identification
- Clear labeling of XP sources and amounts

## Usage Example

```tsx
<XPBreakdown 
  stats={{
    caps: 10,
    activeBonuses: 2,
    activePenalties: 0,
    currentStreak: 3,
    gameHistory: [],
    xp: 100,
    reserveXP: 5,
    reserveCount: 1
  }}
  showTotal={true}
/>
```

## Related Components
- `PlayerProfile`: Parent component that provides XP data
- `GameHistory`: Used to display game participation history
