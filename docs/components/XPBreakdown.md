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
  - `benchWarmerStreak`: Current streak of consecutive reserve appearances (resets if player gets selected or misses a game)
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

## XP Calculation Logic

The XP calculation follows these steps:

1. Base XP Calculation
   - Most Recent Game: 20 XP
   - 1-2 Games Ago: 18 XP
   - 3-4 Games Ago: 16 XP
   - 5-9 Games Ago: 14 XP
   - 10-19 Games Ago: 12 XP
   - 20-29 Games Ago: 10 XP
   - 30-39 Games Ago: 5 XP
   - 40+ Games Ago: 0 XP

2. Reserve XP
   - +5 XP for each game where player was a reserve
   - -10 XP penalty for declining a slot (except same-day declines)

3. Modifiers
   - Attendance Streak: +10% per consecutive game played
   - Bench Warmer Streak: +5% per consecutive reserve appearance (must be consecutive, resets if selected or miss a game)
   - Unpaid Games: -50% per unpaid game (only applies to games older than 24h)

> **Important**: XP will never be negative. If the calculation would result in a negative value, it will be clamped to 0.

### Example Calculations

```typescript
// Base XP calculation
baseXP = 286
reserveXP = 5
totalBaseXP = 291

// Modifiers
streakModifier = 0.1  // 1 game streak
benchWarmerModifier = 0.0  // No bench warmer streak
unpaidGamesModifier = -1.5  // 3 unpaid games (-50% each)

// Final calculation
totalModifier = 1 + 0.1 + 0.0 - 1.5 = -0.4
rawXP = 291 * -0.4 = -116.4
finalXP = Math.max(0, Math.round(-116.4)) = 0  // Clamped to 0
```

### Display Format
The component shows:
1. Base XP from games
2. Reserve XP (if any)
3. Modifiers (with their signs):
   - Attendance Streak: Shows `+10%` for a 1-game streak
   - Bench Warmer Streak: Shows `+5%` for a 1-game reserve streak
   - Unpaid Games: Shows `-50%` per unpaid game

A note "(XP will never be less than 0)" is displayed when the calculation would result in negative XP.

## Features

### Reserve XP Display
- Shows the total Reserve XP earned or lost
- Displays the number of times a player has been a reserve
- Shows bench warmer streak bonus if player has consecutive reserve appearances
- Color-coded UI:
  - Green for positive Reserve XP (being a reserve)
  - Red for negative Reserve XP (declining slots)

### Bench Warmer Streak
- Only shows when player has an active streak of consecutive reserve appearances
- Streak is broken when:
  - Player gets selected for a game
  - Player misses registering for a game
  - Player declines a slot offer
- Provides +5% XP bonus per consecutive reserve appearance
- Example: 3 consecutive reserve appearances = +15% XP bonus
- Helps compensate players who consistently show up as reserves but don't get selected

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
