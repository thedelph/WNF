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
- Includes game results (WIN/LOSS/DRAW)

### Reserve XP
- Shows +5 XP for being reserve
- Shows -10 XP for declining slots
- Added to base XP before multipliers are applied

### Multipliers
1. Streak Multiplier
   - Based on consecutive game participation
   - 10% bonus per streak level
   - Applied to combined (base + reserve) XP

2. Bench Warmer Multiplier
   - Based on consecutive reserve/non-selection status
   - 5% bonus per bench warmer streak level
   - Applied to combined (base + reserve) XP

### Example Calculation
```
Base Game XP: 146
Reserve XP: +5
Combined Base: 151
Streak Multiplier: 1.0 (no streak)
Bench Warmer Multiplier: 1.05 (5% from streak of 1)
Final XP: 151 * 1.0 * 1.05 = 158.55 (rounded to 159)
```

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
