# WhatsApp Bot - Game Announcement Message Guide

**Date:** 2025-10-20
**Purpose:** Instructions for generating automated game announcement messages
**Message Type:** Game registration opening announcement

---

## Message Format

```
📅 [Day Date]
⏰ [Start Time] - [End Time]
🎮 WNF #[Game Number]
📍 [Venue Name]
📍 [Google Maps URL]
🔗 Game Details: https://wnf.app/games
⚽ [Max Players] players / [Team Size]-a-side

🎮 Registration is OPEN!
Register your interest by reacting with a thumbs up 👍

Reply to this message with names of any reserves outside of this group that want to play.

The following players, react with 🪙 if you want to guarantee a spot this week (but you likely won't get a spot next week):

🪙 [Player 1]
🪙 [Player 2]
...

Registration closes [Day Date] at [Time]
```

---

## Database Queries Required

### 1. Get Next Upcoming Game

```sql
SELECT
  id,
  sequence_number,
  date,
  max_players,
  registration_window_start,
  registration_window_end,
  venue_id,
  status
FROM games
WHERE status = 'open'
  AND date >= NOW()
ORDER BY date ASC
LIMIT 1
```

**Returns:**
- `id` - UUID for the game
- `sequence_number` - Game number (e.g., 69 for "WNF #69")
- `date` - **Timestamp with time zone** containing BOTH date AND time (e.g., "2025-10-22T21:00:00+00:00")
- `max_players` - Maximum players (e.g., 18)
- `registration_window_start` - When registration opens (timestamptz)
- `registration_window_end` - When registration closes - deadline (timestamptz)
- `venue_id` - UUID to fetch venue details
- `status` - Should be 'open'

**Note:** There are NO separate `start_time` and `end_time` fields. The game start time is in the `date` field.

---

### 2. Get Venue Details

```sql
SELECT
  name,
  google_maps_url
FROM venues
WHERE id = '[venue_id from step 1]'
```

**Returns:**
- `name` - Venue name (e.g., "Partington Sports Village")
- `google_maps_url` - Google Maps link (e.g., "https://maps.app.goo.gl/...")

---

### 3. Get Token-Eligible Players

```sql
SELECT DISTINCT
  p.id,
  p.friendly_name,
  p.whatsapp_mobile_number
FROM players p
INNER JOIN public_player_token_status pts ON p.id = pts.player_id
WHERE pts.status = 'AVAILABLE'
  AND p.whatsapp_mobile_number IS NOT NULL
  AND p.whatsapp_mobile_number != ''
  AND p.whatsapp_group_member = 'Yes'
ORDER BY p.friendly_name ASC
```

**Returns:**
- `id` - Player UUID
- `friendly_name` - Player name (e.g., "Anthony B", "Simon")
- `whatsapp_mobile_number` - Phone number (for verification/matching)

**Note:** The `public_player_token_status` view automatically checks:
- Player has played in last 10 games
- Player hasn't been selected in last 3 games
- Player has no outstanding payments
- Player is a WhatsApp group member

---

## Message Construction Logic

### Date/Time Formatting

```javascript
/**
 * Add ordinal suffix to day number
 * e.g., 1 -> "1st", 22 -> "22nd"
 */
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return day + 'th';
  switch (day % 10) {
    case 1: return day + 'st';
    case 2: return day + 'nd';
    case 3: return day + 'rd';
    default: return day + 'th';
  }
}

// Format game date with ordinal suffix
const gameDate = new Date(game.date); // Parse timestamp
const day = gameDate.getDate();
const dayWithOrdinal = getOrdinalSuffix(day); // "22nd"
const weekday = gameDate.toLocaleDateString('en-GB', { weekday: 'long' }); // "Wednesday"
const month = gameDate.toLocaleDateString('en-GB', { month: 'long' }); // "October"
const dayDate = `${weekday} ${dayWithOrdinal} ${month}`;
// Result: "Wednesday 22nd October"

// Extract start time from date timestamp (already in UTC/local time)
const startHour = gameDate.getHours();     // 21 (9pm)
const startMinute = gameDate.getMinutes(); // 0
const startAmPm = startHour >= 12 ? 'pm' : 'am';
const startHour12 = startHour % 12 || 12;  // Convert to 12-hour format
const startTime = `${startHour12}:${startMinute.toString().padStart(2, '0')}${startAmPm}`;
// Result: "9:00pm"

// Calculate end time (assume 1 hour duration)
const endDate = new Date(gameDate);
endDate.setHours(endDate.getHours() + 1);
const endHour = endDate.getHours();
const endMinute = endDate.getMinutes();
const endAmPm = endHour >= 12 ? 'pm' : 'am';
const endHour12 = endHour % 12 || 12;
const endTime = `${endHour12}:${endMinute.toString().padStart(2, '0')}${endAmPm}`;
// Result: "10:00pm"
// Combined: "9:00pm - 10:00pm"

// Format registration deadline
const deadline = new Date(game.registration_window_end);
const deadlineDay = deadline.getDate();
const deadlineDayWithOrdinal = getOrdinalSuffix(deadlineDay); // "18th"
const deadlineWeekday = deadline.toLocaleDateString('en-GB', { weekday: 'long' }); // "Saturday"
const deadlineMonth = deadline.toLocaleDateString('en-GB', { month: 'long' }); // "October"
const deadlineDatePart = `${deadlineWeekday} ${deadlineDayWithOrdinal} ${deadlineMonth}`;

const deadlineHour = deadline.getHours();
const deadlineMinute = deadline.getMinutes();
const deadlineAmPm = deadlineHour >= 12 ? 'pm' : 'am';
const deadlineHour12 = deadlineHour % 12 || 12;
const deadlineTime = `${deadlineHour12}:${deadlineMinute.toString().padStart(2, '0')}${deadlineAmPm}`;
const deadlineFormatted = `${deadlineDatePart} at ${deadlineTime}`;
// Result: "Saturday 18th October at 1:00pm"
```

### Team Size Calculation

```javascript
const teamSize = game.max_players / 2;
// max_players: 18 → teamSize: 9 → "9-a-side"
```

### Token-Eligible Players List

```javascript
// Build token list with coin emoji
let tokenSection = '';
if (tokenEligiblePlayers.length > 0) {
  tokenSection = '\n\n' +
    'The following players, react with 🪙 if you want to guarantee a spot this week ' +
    '(but you likely won\'t get a spot next week):\n\n';

  tokenEligiblePlayers.forEach(player => {
    tokenSection += `🪙 ${player.friendly_name}\n`;
  });
}
```

---

## Complete Example Code

```typescript
import { supabaseService } from './supabase-client';
import { format } from 'date-fns';

async function generateGameAnnouncement(): Promise<string> {
  // 1. Get next game
  const { data: game, error: gameError } = await supabaseService.getClient()
    .from('games')
    .select('*')
    .eq('status', 'open')
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true })
    .limit(1)
    .single();

  if (gameError || !game) {
    throw new Error('No open games found');
  }

  // 2. Get venue
  const { data: venue } = await supabaseService.getClient()
    .from('venues')
    .select('name, google_maps_url')
    .eq('id', game.venue_id)
    .single();

  // 3. Get token-eligible players
  const { data: tokenPlayers } = await supabaseService.getClient()
    .from('public_player_token_status')
    .select(`
      player_id,
      players!inner(
        friendly_name,
        whatsapp_mobile_number,
        whatsapp_group_member
      )
    `)
    .eq('status', 'AVAILABLE')
    .not('players.whatsapp_mobile_number', 'is', null)
    .eq('players.whatsapp_group_member', 'Yes')
    .order('players.friendly_name', { ascending: true });

  // Format dates and times
  const gameDate = new Date(game.date);

  // Format day with ordinal suffix (e.g., "Wednesday 22nd October")
  const day = gameDate.getDate();
  const dayWithOrdinal = getOrdinalSuffix(day);
  const weekday = gameDate.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = gameDate.toLocaleDateString('en-GB', { month: 'long' });
  const dayDate = `${weekday} ${dayWithOrdinal} ${month}`;

  // Extract start time from timestamp
  const startHour = gameDate.getHours();
  const startMinute = gameDate.getMinutes();
  const startAmPm = startHour >= 12 ? 'pm' : 'am';
  const startHour12 = startHour % 12 || 12;
  const startTime = `${startHour12}:${startMinute.toString().padStart(2, '0')}${startAmPm}`;

  // Calculate end time (assume 1 hour duration)
  const endDate = new Date(gameDate);
  endDate.setHours(endDate.getHours() + 1);
  const endHour = endDate.getHours();
  const endMinute = endDate.getMinutes();
  const endAmPm = endHour >= 12 ? 'pm' : 'am';
  const endHour12 = endHour % 12 || 12;
  const endTime = `${endHour12}:${endMinute.toString().padStart(2, '0')}${endAmPm}`;

  // Format deadline with ordinal suffix
  const deadline = new Date(game.registration_window_end);
  const deadlineDay = deadline.getDate();
  const deadlineDayWithOrdinal = getOrdinalSuffix(deadlineDay);
  const deadlineWeekday = deadline.toLocaleDateString('en-GB', { weekday: 'long' });
  const deadlineMonth = deadline.toLocaleDateString('en-GB', { month: 'long' });
  const deadlineDatePart = `${deadlineWeekday} ${deadlineDayWithOrdinal} ${deadlineMonth}`;

  const deadlineHour = deadline.getHours();
  const deadlineMinute = deadline.getMinutes();
  const deadlineAmPm = deadlineHour >= 12 ? 'pm' : 'am';
  const deadlineHour12 = deadlineHour % 12 || 12;
  const deadlineTime = `${deadlineHour12}:${deadlineMinute.toString().padStart(2, '0')}${deadlineAmPm}`;
  const deadlineFormatted = `${deadlineDatePart} at ${deadlineTime}`;

  const teamSize = game.max_players / 2;

  // Build message
  let message = [
    `📅 ${dayDate}`,
    `⏰ ${startTime} - ${endTime}`,
    `🎮 WNF #${game.sequence_number}`,
    `📍 ${venue?.name || 'TBD'}`,
    `📍 ${venue?.google_maps_url || ''}`,
    `🔗 Game Details: https://wnf.app/games`,
    `⚽ ${game.max_players} players / ${teamSize}-a-side`,
    '',
    `🎮 Registration is OPEN!`,
    `Register your interest by reacting with a thumbs up 👍`,
    '',
    `Reply to this message with names of any reserves outside of this group that want to play.`
  ].join('\n');

  // Add token-eligible players if any exist
  if (tokenPlayers && tokenPlayers.length > 0) {
    message += '\n\n';
    message += 'The following players, react with 🪙 if you want to guarantee a spot this week (but you likely won\'t get a spot next week):\n\n';

    tokenPlayers.forEach((tp: any) => {
      message += `🪙 ${tp.players.friendly_name}\n`;
    });
  }

  // Add deadline
  message += `\n\nRegistration closes ${deadlineFormatted}`;

  return message;
}

// Usage
const announcement = await generateGameAnnouncement();
console.log(announcement);
```

---

## When to Send

The announcement should be sent when:
1. A new game's `status` changes to `'open'`
2. The `registration_window_start` timestamp is reached
3. An admin manually triggers the announcement

**Recommendation:** Use a cron job or scheduled task that runs every hour and checks:
```sql
SELECT id
FROM games
WHERE status = 'open'
  AND registration_window_start <= NOW()
  AND registration_window_end > NOW()
  AND date >= NOW()
  AND NOT EXISTS (
    SELECT 1
    FROM bot_messages
    WHERE game_id = games.id
      AND message_type = 'announcement'
  )
```

This ensures each game only gets one announcement message.

---

## Tracking the Sent Message

After sending the announcement, store it in `bot_messages`:

```javascript
const message = await whatsappClient.sendMessage(groupId, announcement);

await supabaseService.getClient()
  .from('bot_messages')
  .insert({
    message_id: message.id._serialized,
    game_id: game.id,
    message_type: 'announcement',
    message_content: announcement,
    sent_to: groupId,
    success: true
  });
```

**Why track it?**
- Enables reaction-based registration (👍 on this specific message)
- Prevents duplicate announcements
- Provides audit trail
- Allows analytics on message delivery

---

## Edge Cases to Handle

### No Token-Eligible Players
If no players are token-eligible, skip the entire token section:
```javascript
if (tokenPlayers && tokenPlayers.length > 0) {
  // Add token section
}
// Otherwise, message ends with reserve invitation
```

### Missing Venue Information
```javascript
const venueName = venue?.name || 'Venue TBD';
const venueUrl = venue?.google_maps_url || '';
```

### No Open Games
```javascript
if (!game) {
  // No announcement to send
  logger.info('No open games available for announcement');
  return null;
}
```

---

## Testing

Test with these scenarios:

1. **Normal game with token-eligible players** (like the example)
2. **Game with no token-eligible players** (token section should be omitted)
3. **Game with many token players** (ensure formatting remains clean)
4. **Game at different times** (test 12-hour time formatting)

**Test Query:**
```sql
-- Check what the next announcement would look like
SELECT
  g.sequence_number,
  g.date,
  g.start_time,
  v.name as venue,
  COUNT(DISTINCT pts.player_id) as token_eligible_count
FROM games g
LEFT JOIN venues v ON g.venue_id = v.id
LEFT JOIN public_player_token_status pts ON pts.status = 'AVAILABLE'
LEFT JOIN players p ON pts.player_id = p.id
  AND p.whatsapp_group_member = 'Yes'
  AND p.whatsapp_mobile_number IS NOT NULL
WHERE g.status = 'open'
  AND g.date >= NOW()
GROUP BY g.id, v.name
ORDER BY g.date ASC
LIMIT 1
```

---

## Related Documentation

- See `DATABASE_SCHEMA_REFERENCE.md` for complete schema details
- See `INTEGRATION_EXAMPLES.md` for reaction handler implementation
- See `WEB_APP_HANDOVER.md` for overview of integration points

---

**Last Updated:** 2025-10-21

**Recent Changes:**
- Updated to reflect actual database schema (no separate start_time/end_time fields)
- Added ordinal suffix function for dates (22nd, 18th)
- Updated time formatting to extract from timestamp
- Added 1-hour duration assumption for end time calculation
- Corrected all code examples to match implementation
