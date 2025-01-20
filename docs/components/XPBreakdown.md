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
    benchWarmerStreak?: number;
    unpaidGamesCount?: number;
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
  - `benchWarmerStreak`: Current streak of being on reserve/not selected
  - `unpaidGamesCount`: Number of unpaid games (older than 24h)
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

### Modifiers
All modifiers are combined and applied to the TOTAL (base + reserve) XP at the END:

1. Streak Modifier
   - Based on consecutive game participation
   - 10% bonus per streak level
   - Formula: current_streak * 0.1
   - Example: Streak of 13 = 13 * 0.1 = +1.3 modifier

2. Bench Warmer Modifier
   - Based on consecutive reserve/non-selection status
   - 5% bonus per bench warmer streak level
   - Formula: bench_warmer_streak * 0.05
   - Example: Bench streak of 2 = 2 * 0.05 = +0.1 modifier

3. Unpaid Games Modifier
   - Based on number of unpaid games (older than 24h)
   - -30% penalty per unpaid game
   - Formula: unpaid_games_count * -0.3
   - Example: 3 unpaid games = 3 * -0.3 = -0.9 modifier

### Final Calculation Order
```typescript
// 1. Sum raw base XP (no multipliers)
const baseXP = gameHistory.reduce((total, game) => {
  return total + getBaseXPForGame(game);
}, 0);

// 2. Add reserve XP
const totalBaseXP = baseXP + (reserveXP || 0);

// 3. Calculate modifiers
const streakModifier = currentStreak * 0.1;
const benchWarmerModifier = benchWarmerStreak * 0.05;
const unpaidGamesModifier = unpaidGamesCount * -0.3;

// 4. Combine modifiers and apply to total
const totalModifier = 1 + streakModifier + benchWarmerModifier + unpaidGamesModifier;
const finalXP = Math.round(totalBaseXP * totalModifier);
```

### Display Format

The XP breakdown displays the calculation in a clear, mathematical format:

1. Base Components:
   - If only Base XP: Shows just the base value (e.g., `286`)
   - If Base + Reserve XP: Shows both with brackets (e.g., `(286 + 5)`)

2. Modifiers (shown with their signs):
   - Attendance Streak: Shows `+10%` for a 1-game streak
   - Reserve Streak: Shows `+5%` for a 1-game reserve streak
   - Unpaid Games: Shows `-30%` per unpaid game

Example displays:
```
// Just base XP with unpaid penalty
286 × (1 - 0.9) = 29

// Base XP with streak and unpaid penalty
286 × (1 + 0.1 - 0.9) = 57

// Base + Reserve XP with all modifiers
(286 + 5) × (1 + 0.1 + 0.05 - 0.9) = 73
```

The formula follows BODMAS (Brackets, Order, Division/Multiplication, Addition/Subtraction) to clearly show the order of operations:
1. Base XP and Reserve XP are added first (within brackets when both present)
2. All modifiers are combined (1 + positive modifiers - negative modifiers)
3. Final result is rounded to whole numbers

### Example Calculation
```
Base XP = 286
Reserve XP = 0
Total Base = 286

Modifiers:
- Streak (1 game): +0.1
- Bench streak (0): +0.0
- Unpaid games (3): -0.9

Total modifier = 1 + 0.1 + 0.0 - 0.9 = 0.2
Final XP = ROUND(286 * 0.2) = 57
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

### Unpaid Games Display
- Shows the number of unpaid games (older than 24h)
- Color-coded UI:
  - Red for unpaid games

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
    reserveCount: 1,
    unpaidGamesCount: 2
  }}
  showTotal={true}
/>
```

## Related Components
- `PlayerProfile`: Parent component that provides XP data
- `GameHistory`: Used to display game participation history
