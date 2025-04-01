# Timezone Handling in WNF

## Overview

The WNF application handles dates and times with specific attention to UK timezone (GMT/BST). This document explains how timezone handling works throughout the application, especially during daylight saving time transitions.

## Key Principles

1. **Storage**: All timestamps are stored in UTC format in the database
2. **Input**: When creating games, local UK time is converted to UTC before storage
3. **Display**: When displaying times to users, UTC is converted back to UK time (GMT/BST)
4. **Automatic Adjustment**: The system automatically handles transitions between GMT and BST

## Implementation Details

### Date Utilities (`dateUtils.ts`)

The `dateUtils.ts` file contains the core timezone handling functionality:

- `UK_TIMEZONE`: Constant set to 'Europe/London' which automatically handles BST/GMT transitions
- `utcToUkTime()`: Converts UTC dates to UK timezone (adds +1 hour during BST)
- `ukTimeToUtc()`: Converts UK timezone dates to UTC (subtracts 1 hour during BST)
- `formatDate()`: Formats dates in UK format with timezone conversion
- `formatTime()`: Formats times in 12-hour format with timezone conversion
- `formatDateTime()`: Combines date and time formatting with timezone conversion

### Game Creation (`CreateGameForm.tsx`)

When creating a new game:

1. The admin inputs the game time in local UK time
2. The `convertToUtcForStorage()` function converts this to UTC before storing in the database
3. During BST, a game at 9:00 PM UK time is stored as 8:00 PM UTC
4. During GMT, a game at 9:00 PM UK time is stored as 9:00 PM UTC

```typescript
// Example: Converting UK time to UTC for storage
const convertToUtcForStorage = (localDateTimeStr: string): string => {
  const localDateTime = new Date(localDateTimeStr);
  const utcDateTime = ukTimeToUtc(localDateTime);
  return utcDateTime.toISOString();
};
```

### Game Display (`GameHeader.tsx`)

When displaying game times:

1. The UTC time from the database is converted to UK time
2. During BST, 8:00 PM UTC is displayed as 9:00 PM UK time
3. A tooltip indicates that times are displayed in UK time

```typescript
// Example: Converting UTC to UK time for display
const formattedDate = game.date ? formatDate(utcToUkTime(new Date(game.date))) : '';
const kickoffTime = game.date ? formatTime(game.date) : '';
```

### Registration Windows and Countdowns

Time-sensitive features like registration windows and countdowns also use timezone-aware functions:

- `useRegistrationClose.ts`: Uses `utcToUkTime()` to determine if registration should close
- `useTeamAnnouncement.ts`: Uses timezone conversion for team announcement timing
- `CountdownTimer.tsx`: Converts target dates to UK time for accurate countdowns

## Common Pitfalls

1. **Double Conversion**: Be careful not to convert timezones twice. The `formatTime()` function already handles conversion internally.

2. **Direct Date Comparisons**: When comparing dates (e.g., checking if registration is open), always convert both dates to the same timezone first.

3. **Testing During Transitions**: Test the application behavior around daylight saving time transitions (usually late March and late October).

## Troubleshooting

If times are displaying incorrectly:

1. Check if the time is stored correctly in UTC in the database
2. Verify that the appropriate conversion function is being used
3. Add console logging to trace the conversion process:
   ```typescript
   console.log('Original UTC time:', originalDate.toISOString());
   console.log('Converted UK time:', ukDate.toString());
   ```

## Related Components

The following components rely on proper timezone handling:

- `GameHeader.tsx`: Displays game date, time, and countdown
- `CountdownTimer.tsx`: Shows time remaining until events
- `WeatherCard.tsx`: Fetches weather data based on game time
- `Game.tsx`: Determines registration windows and team announcements
- `CreateGameForm.tsx`: Handles game creation with proper timezone storage
