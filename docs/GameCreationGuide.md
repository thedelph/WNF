# Game Creation Guide

This document provides a comprehensive guide to the game creation process in the WNF application, focusing on the different phases of game creation and the various components involved.

## Overview

The game creation process is handled by the `CreateGameForm` component, which supports three distinct phases:
1. Upcoming Game
2. Player Selection
3. Team Announcement

Each phase has its own specific requirements and behaviors while sharing some common functionality.

## Common Features

### Default Values
- **Max Players**: 18 players per game
- **Pitch Cost**: £50 default
- **Random Slots**: 2 slots reserved for random selection
- **Default Game Time**: 21:00 (9 PM)

### Date Constraints
The application enforces strict date constraints through database validation:
```sql
registration_window_start < registration_window_end AND registration_window_end <= date
```

## Timezone Handling

### Important: UK Time vs. UTC Storage
All game times are input in UK local time (GMT/BST) but stored in UTC in the database:

- During GMT (winter): UK time = UTC time
- During BST (summer): UK time = UTC + 1 hour

The application automatically handles this conversion:

```typescript
// When creating a game
const localGameDateTime = `${date}T${time}`;
const gameDateTime = convertToUtcForStorage(localGameDateTime);
```

### Best Practices for Time Input
- Always input times in UK local time (the time you want the game to actually start in the UK)
- The system will automatically convert to UTC for storage
- When viewing game times, they will be converted back to UK time for display
- For more details, see the [Timezone Handling documentation](./TimezoneHandling.md)

## Game Phases

### 1. Upcoming Game Phase

This is the initial phase when creating a new game. 

#### Key Features:
- Allows setting custom registration window dates
- Registration window must be before the game date
- Team announcement time can be set manually (defaults to 4 hours before game time)
- Supports modification of team announcement time through the EditGameModal

#### Required Fields:
- Game Date
- Game Time
- Venue
- Registration Window Start
- Registration Window End
- Team Announcement Time (optional, defaults to 4 hours before game time)

#### Time Constraints:
```sql
registration_window_start < registration_window_end < team_announcement_time <= date
```

#### Best Practices:
- Set team announcement time at least 2 hours before the game to give players sufficient notice
- Consider time zones when setting announcement times for international players
- Team announcement time should be after registration ends to ensure all registrations are processed

### 2. Player Selection Phase

This phase is used when creating a game where players have already been selected.

#### Key Features:
- Registration window is automatically set to be in the past:
  - Start: 48 hours before game time
  - End: 24 hours before game time
- Supports player list pasting functionality
- Players can be marked as:
  - Confirmed (Selected by merit)
  - Random Pick
  - Reserve
  - Dropped Out

#### Player Selection Methods:
- **Merit Selection**: Players selected based on their performance/ranking
- **Random Selection**: Players selected randomly from the available pool
- **Reserve List**: Players on standby in case of dropouts
- **Dropped Out**: Players who were selected but can't participate

### 3. Team Announcement Phase

The final phase where teams have been formed and are ready to be announced.

#### Key Features:
- Supports team A and B player assignments
- Tracks team attack and defense ratings
- Team announcement time is required
- Registration window is set in the past (same as Player Selection phase)

#### Team Balance Features:
- Attack Rating tracking per team
- Defense Rating tracking per team
- Equal team size enforcement

## Technical Implementation Details

### Date Handling
```typescript
// For non-upcoming games, registration window is set automatically
if (gamePhase !== GAME_STATUSES.UPCOMING) {
  const gameDate = new Date(gameDateTime);
  registrationStartDate = new Date(gameDate.getTime() - (48 * 60 * 60 * 1000));
  registrationEndDate = new Date(gameDate.getTime() - (24 * 60 * 60 * 1000));
}

// Calculate team announcement time (4 hours before game start)
const calculateTeamAnnouncementTime = (gameDateTime: string) => {
  const gameDate = new Date(gameDateTime);
  const announcementTime = new Date(gameDate.getTime() - (4 * 60 * 60 * 1000));
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
```

### Timezone Conversion
```typescript
// Convert local UK time to UTC for storage
const convertToUtcForStorage = (localDateTimeStr: string): string => {
  // Parse the local date time string
  const localDateTime = new Date(localDateTimeStr);
  
  // Convert to UTC using our utility function
  const utcDateTime = ukTimeToUtc(localDateTime);
  
  // Format as ISO string and return
  return utcDateTime.toISOString();
};
```

### Player Registration
Players are registered with different statuses depending on their selection:
```typescript
{
  game_id: string;
  player_id: string;
  status: 'selected' | 'reserve' | 'dropped_out';
  selection_method: 'merit' | 'random' | 'none';
}
```

### Database Constraints
The application enforces several constraints to maintain data integrity:
1. Valid dates (registration windows must be properly ordered)
2. Maximum player count (18 players per game)
3. Team size balance
4. Unique player registrations per game

## Component Structure

The form is broken down into several sub-components for maintainability:
- `BasicGameDetails`: Handles basic game information
- `GameTimingDetails`: Manages dates and times
- `PlayerSelectionDetails`: Handles player selection and status
- `TeamAnnouncementDetails`: Manages team formation
- `GameDetailsPaste`: Supports pasting player lists

## Error Handling

The form includes comprehensive error handling for:
- Date validation failures
- Database constraints violations
- Player selection conflicts
- Team balance issues
- Network errors during submission

## Best Practices

1. **Date Management**:
   - Always validate dates before submission
   - Use consistent timezone handling (UTC)
   - Respect the registration window constraints

2. **Player Selection**:
   - Verify player existence in database
   - Maintain proper selection method attribution
   - Handle duplicates appropriately

3. **Team Formation**:
   - Ensure equal team sizes
   - Balance team ratings
   - Validate all player assignments

## Future Considerations

1. Support for multiple venues
2. Flexible team sizes
3. Custom registration window durations
4. Advanced team balancing algorithms
5. Integration with player rating system

This documentation will be updated as new features are added or existing ones are modified.
