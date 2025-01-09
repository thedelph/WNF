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
