# XPBreakdown Component

## Overview
The XPBreakdown component displays a detailed breakdown of a player's XP (Experience Points) from various sources, including game participation, streaks, and reserve status. The streak calculation is based solely on past games and is not affected by future game registrations or team selections.

## XP Penalties and Bonuses

### Status Change Rules
The XP system includes penalties and bonuses for player status changes:

#### Selected Players
- Dropping out before game day: No penalty
- Dropping out on game day: -10 XP penalty

#### Reserve Players
- Declining slot before game day: -10 XP penalty
- Declining slot on game day: No penalty
- Accepting slot on game day: +10 XP bonus

"Game day" is determined by comparing the calendar date of the action with the game date. For example, if a game is on Friday at 21:00, any action taken on Friday (00:00-23:59) is considered "on game day."

### Display Format
The XPBreakdown component shows these penalties and bonuses:
- Red text for penalties (-10 XP)
- Green text for bonuses (+10 XP)
- Tooltips explaining the timing of the status change

## Status Changes and XP

### Player Status Rules
The XP system tracks and responds to player status changes:

#### Selected Players
- **Before Game Day**
  - Can drop out without penalty
  - Status changes to 'dropped_out'

- **On Game Day**
  - -10 XP penalty for dropping out
  - Status changes to 'dropped_out'
  - Shown in red in the XP breakdown

#### Reserve Players
- **Before Game Day**
  - -10 XP for declining a slot
  - Status changes to 'dropped_out'
  - Breaks bench warmer streak
  - Cannot receive more slot offers

- **On Game Day**
  - No penalty for declining
  - +10 XP for accepting
  - Status changes to 'dropped_out' if declined
  - Maintains bench warmer streak

### Display Format
- Red text (-10 XP): Penalties for dropouts/declines
- Green text (+10 XP): Rewards for accepting slots
- Tooltips show:
  - When the change occurred
  - Whether it was on game day
  - Impact on streaks

## Props

```typescript
interface XPBreakdownProps {
  stats: {
    caps: number;
    activeBonuses: number;
    activePenalties: number;
    currentStreak: number;
    gameHistory?: GameHistory[];
    latestSequence?: number; // Required for proper XP calculation
    xp: number;
    reserveXP?: number;      // IMPORTANT: Note the uppercase 'P' in reserveXP
    reserveCount?: number;
    benchWarmerStreak?: number;
    unpaidGamesCount?: number;
  };
  showTotal?: boolean;
}
```

> **Important Note**: When passing props to the XPBreakdown component, ensure that the property names match exactly, including case sensitivity. In particular, `reserveXP` must use an uppercase 'P' (not `reserveXp`), or reserve XP will not be displayed correctly.

### Props Description
- `stats`: Object containing all XP-related statistics
  - `caps`: Number of games played
  - `activeBonuses`: Current active XP bonuses
  - `activePenalties`: Current active XP penalties
  - `currentStreak`: Current attendance streak (based on past games only)
  - `gameHistory`: Array of past games and their details
  - `latestSequence`: Most recent game sequence number (critical for XP calculation - determines which games are considered "past" vs "future")
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
   - The component uses `latestSequence` to determine which games are in the past vs. future
   - Games where `game.sequence > latestSequence` are considered future games and skipped
   - Games where player dropped out are also skipped
   - XP is calculated for past games based on how many games ago they occurred:
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

## Troubleshooting

### Common Issues

#### Empty XP Breakdown / All Games Skipped as "Future Games"
If the XP Breakdown component appears empty or shows 0 XP despite having game history, check the following:

1. Ensure the `latestSequence` property is correctly set and passed to the component
   - In Profile.tsx, this should be fetched from the database (most recent completed game's sequence number)
   - Setting `latestSequence: 0` will cause all games to be treated as future games and skipped
   - Console logs will show "[XPBreakdown] Skipping game X - future game" for all games

2. Verify the game history data structure
   - Each game should have a `sequence` number and `status` property
   - Games with status 'dropped_out' are skipped in XP calculation

3. Check the console for debugging information
   - The component logs detailed information about its calculations
   - Look for "[XPBreakdown]" prefixed logs to trace the calculation process

#### Differences Between Personal and Public Profiles
If the XP Breakdown shows different values on personal vs. public profiles:

1. Compare the props being passed to the component in both Profile.tsx and PlayerProfile.tsx
2. Ensure both are using the same `latestSequence` value
3. Verify that game history data is structured the same way in both components

### Implementation Notes

When implementing the XPBreakdown component in different views:

1. Always fetch the latest sequence number from completed games:
   ```typescript
   const { data: latestSeqData } = await supabase
     .from('games')
     .select('sequence_number')
     .eq('completed', true)
     .order('sequence_number', { ascending: false })
     .limit(1);
   
   const latestSequence = latestSeqData && latestSeqData.length > 0 
     ? latestSeqData[0].sequence_number 
     : 0;
   ```

2. Pass this value to the XPBreakdown component:
   ```tsx
   <XPBreakdown
     stats={{
       // other stats...
       gameHistory: gameHistoryArray,
       latestSequence: latestSequence,
       // remaining stats...
     }}
   />
   ```

This ensures consistent XP calculation across different views of the same player data.

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
