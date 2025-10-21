# WhatsApp Bot - Technical Specification

**Created:** 2025-10-21
**Purpose:** Detailed technical specification for bot implementation
**Source:** Web app Claude Code instance with database schema access
**Target:** Home server bot Claude Code instance for implementation

---

## 📊 Database Schema Reference

### Critical: XP Data Location

**⚠️ IMPORTANT:** XP is **NOT** in the `players` table. Use the `player_stats` VIEW instead.

```sql
-- ✅ CORRECT: Get XP from player_stats view
SELECT id, friendly_name, xp, caps, current_streak, max_streak, win_rate
FROM player_stats
WHERE id = 'player-uuid';

-- ❌ WRONG: XP does not exist in players table
SELECT xp FROM players WHERE id = 'player-uuid'; -- This will fail!
```

### Players Table Structure

**Table:** `players`

**Key columns for bot:**
```sql
id                          UUID
user_id                     UUID
friendly_name               TEXT
caps                        INTEGER
current_streak              INTEGER
max_streak                  INTEGER
whatsapp_mobile_number      TEXT         -- E.164 format: +447123456789
whatsapp_group_member       TEXT         -- 'Yes', 'No', or NULL
shield_tokens_available     INTEGER
games_played_since_shield_launch  INTEGER
shield_active               BOOLEAN
frozen_streak_value         INTEGER
attack_rating               NUMERIC
defense_rating              NUMERIC
game_iq                     NUMERIC
gk                          NUMERIC
average_attack_rating       NUMERIC
average_defense_rating      NUMERIC
average_game_iq_rating      NUMERIC
average_gk_rating           NUMERIC
```

### Player Stats View

**View:** `player_stats`

**Use this for XP data:**
```sql
SELECT
  id,
  friendly_name,
  xp,                    -- ✅ XP is here!
  caps,
  current_streak,
  max_streak,
  win_rate,              -- NUMERIC (e.g., 0.67 for 67%)
  attack_rating,
  defense_rating
FROM player_stats
WHERE id = 'player-uuid';
```

### Games Table Structure

**Table:** `games`

**Key columns:**
```sql
id                          UUID
sequence_number             INTEGER       -- Game #69, #70, etc.
date                        TIMESTAMPTZ   -- Game date AND time combined
registration_window_start   TIMESTAMPTZ
registration_window_end     TIMESTAMPTZ
status                      game_status   -- ENUM
max_players                 INTEGER
venue_id                    UUID
pitch_cost                  NUMERIC
payment_link                TEXT
teams_announced             BOOLEAN
team_announcement_time      TIMESTAMPTZ
completed                   BOOLEAN
```

**Status ENUM values:**
- `open` - Registration open
- `upcoming` - Game scheduled
- `players_announced` - Players selected
- `teams_announced` - Teams allocated
- `completed` - Game finished

**⚠️ Time Handling:**
The `date` field is a TIMESTAMPTZ containing **BOTH** date and time:
```
date: "2025-10-22 20:00:00+00"
       ↑ Date       ↑ Time (8pm UTC / 9pm BST)
```

**No separate `start_time` or `end_time` fields exist.**

### Venues Table

**Table:** `venues`

```sql
id                  UUID
name                TEXT               -- "Partington Sports Village"
google_maps_url     TEXT               -- "https://maps.app.goo.gl/..."
address             TEXT
is_default          BOOLEAN
```

**Example query:**
```sql
SELECT name, google_maps_url
FROM venues
WHERE id = 'venue-uuid';
```

### Game Registrations Table

**Table:** `game_registrations`

```sql
id                      UUID
game_id                 UUID
player_id               UUID
status                  TEXT          -- 'selected', 'reserve', 'registered'
team                    TEXT          -- 'blue', 'orange', NULL
paid                    BOOLEAN
using_token             BOOLEAN
had_token               BOOLEAN
late_reserve            BOOLEAN
selection_method        TEXT
created_at              TIMESTAMPTZ
```

### Bot Tables (Already Created)

**Table:** `bot_messages`

**Purpose:** Track sent messages for reaction handling

```sql
id              UUID
message_id      VARCHAR(255)    -- WhatsApp message ID
game_id         UUID
message_type    VARCHAR(50)     -- 'announcement', 'player_selection', etc.
message_content TEXT
sent_at         TIMESTAMPTZ
sent_to         VARCHAR(50)     -- Group ID
success         BOOLEAN
error_message   TEXT
```

**Table:** `bot_interactions`

**Purpose:** Log all bot interactions for analytics

```sql
id                  UUID
player_id           UUID
phone_number        VARCHAR(20)
interaction_type    VARCHAR(50)     -- 'command', 'reaction', 'message'
command             VARCHAR(100)    -- '/xp', '/stats', etc.
message_content     TEXT
response            TEXT
success             BOOLEAN
error_message       TEXT
created_at          TIMESTAMPTZ
```

---

## 🔧 RPC Functions Available

### Token Management

**Function:** `use_player_token(p_player_id UUID, p_game_id UUID)`

**Returns:** BOOLEAN (true if token consumed, false if unavailable)

**Usage:**
```typescript
const { data, error } = await supabase.rpc('use_player_token', {
  p_player_id: 'player-uuid',
  p_game_id: 'game-uuid'
});

if (data === true) {
  // Token successfully used
}
```

**Function:** `check_player_token(p_player_id UUID)`

**Returns:** RECORD (token status information)

**Usage:**
```typescript
const { data } = await supabase.rpc('check_player_token', {
  p_player_id: 'player-uuid'
});
```

**Function:** `use_shield_token(p_player_id UUID, p_game_id UUID, p_user_id UUID)`

**Returns:** BOOLEAN

**Usage:**
```typescript
const { data } = await supabase.rpc('use_shield_token', {
  p_player_id: 'player-uuid',
  p_game_id: 'game-uuid',
  p_user_id: 'user-uuid'
});
```

**Function:** `check_shield_eligibility(p_player_id UUID, p_game_id UUID)`

**Returns:** RECORD (shield status)

---

## 📋 Query Patterns for Bot Commands

### `/xp` Command

**Query:**
```typescript
const { data, error } = await supabase
  .from('player_stats')
  .select('xp, caps, friendly_name')
  .eq('id', playerId)
  .single();

// Response format:
// Your XP: 1,234
// Caps: 45
```

### `/stats` Command

**Query:**
```typescript
const { data } = await supabase
  .from('player_stats')
  .select(`
    friendly_name,
    xp,
    caps,
    current_streak,
    max_streak,
    win_rate,
    attack_rating,
    defense_rating
  `)
  .eq('id', playerId)
  .single();

// Get shield info from players table
const { data: shieldData } = await supabase
  .from('players')
  .select('shield_tokens_available, games_played_since_shield_launch')
  .eq('id', playerId)
  .single();
```

**Response format:**
```
📊 Stats for [Name]

🎮 XP: 1,234
🏆 Win Rate: 67%
🔥 Streak: 5 games
⭐ Best Streak: 12 games
🎯 Caps: 45
🛡️ Shields: 2/4
```

### `/tokens` Command

**Query using view:**
```typescript
// Check token eligibility from view
const { data } = await supabase
  .from('token_eligibility_unpaid_games_view')
  .select('count')
  .eq('player_id', playerId)
  .maybeSingle();

const hasUnpaidGames = data && data.count > 0;
```

**Or use RPC:**
```typescript
const { data } = await supabase.rpc('check_player_token', {
  p_player_id: playerId
});
```

### `/shields` Command

**Query:**
```typescript
const { data } = await supabase
  .from('players')
  .select(`
    shield_tokens_available,
    games_played_since_shield_launch,
    shield_active,
    frozen_streak_value
  `)
  .eq('id', playerId)
  .single();

const tokensAvailable = data.shield_tokens_available || 0;
const gamesPlayed = data.games_played_since_shield_launch || 0;
const gamesUntilNext = Math.max(0, 10 - (gamesPlayed % 10));
```

### `/nextgame` Command

**Query:**
```typescript
const { data: game } = await supabase
  .from('games')
  .select(`
    sequence_number,
    date,
    max_players,
    status,
    venues (
      name,
      google_maps_url
    )
  `)
  .gte('date', new Date().toISOString())
  .order('date', { ascending: true })
  .limit(1)
  .single();

// Extract date and time from date field
const gameDate = new Date(game.date);
const dayName = gameDate.toLocaleDateString('en-GB', { weekday: 'long' });
const timeString = gameDate.toLocaleTimeString('en-GB', {
  hour: '2-digit',
  minute: '2-digit'
});
```

---

## 📢 Game Announcement Specification

### Query for Announcement Data

**1. Get next open game:**
```typescript
const { data: game } = await supabase
  .from('games')
  .select(`
    id,
    sequence_number,
    date,
    max_players,
    registration_window_start,
    registration_window_end,
    status,
    venue_id
  `)
  .eq('status', 'open')
  .gte('date', new Date().toISOString())
  .order('date', { ascending: true })
  .limit(1)
  .single();
```

**2. Get venue:**
```typescript
const { data: venue } = await supabase
  .from('venues')
  .select('name, google_maps_url')
  .eq('id', game.venue_id)
  .single();
```

**3. Get token-eligible players:**

**✅ Use the materialized view:** The `public_player_token_status` view **DOES EXIST**.

```typescript
// Simple query - the view pre-calculates all eligibility criteria
const { data: tokenEligiblePlayers } = await supabase
  .from('public_player_token_status')
  .select(`
    player_id,
    token_status,
    is_eligible,
    players!inner (
      friendly_name,
      whatsapp_mobile_number
    )
  `)
  .eq('is_eligible', true)
  .eq('players.whatsapp_group_member', 'Yes')
  .not('players.whatsapp_mobile_number', 'is', null)
  .order('players(friendly_name)', { ascending: true });

// Result structure:
// [
//   {
//     player_id: 'uuid',
//     token_status: 'AVAILABLE',
//     is_eligible: true,
//     players: {
//       friendly_name: 'Anthony B',
//       whatsapp_mobile_number: '+447711785688'
//     }
//   },
//   ...
// ]
```

**What the view checks automatically:**
- Player has played in last 10 games
- Player has NOT been selected in last 3 games
- Player has no outstanding unpaid games
- Player is a WhatsApp group member

**Note:** This is a **materialized view**, so data is pre-calculated and cached. If you need absolutely live data, you can refresh it:
```sql
REFRESH MATERIALIZED VIEW public_player_token_status;
```
However, for announcements, the cached data is fine since token eligibility doesn't change minute-to-minute.

### Date/Time Formatting

**Ordinal suffix function:**
```typescript
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return day + 'th';
  switch (day % 10) {
    case 1: return day + 'st';
    case 2: return day + 'nd';
    case 3: return day + 'rd';
    default: return day + 'th';
  }
}
```

**Extract date/time from `date` field:**
```typescript
const gameDate = new Date(game.date);

// Day with ordinal
const day = gameDate.getDate();
const dayWithOrdinal = getOrdinalSuffix(day); // "22nd"
const weekday = gameDate.toLocaleDateString('en-GB', { weekday: 'long' }); // "Wednesday"
const month = gameDate.toLocaleDateString('en-GB', { month: 'long' }); // "October"
const dayDate = `${weekday} ${dayWithOrdinal} ${month}`; // "Wednesday 22nd October"

// Start time (from date field)
const startHour = gameDate.getHours();     // 21 (9pm)
const startMinute = gameDate.getMinutes(); // 0
const startAmPm = startHour >= 12 ? 'pm' : 'am';
const startHour12 = startHour % 12 || 12;
const startTime = `${startHour12}:${startMinute.toString().padStart(2, '0')}${startAmPm}`;
// Result: "9:00pm"

// End time (+1 hour)
const endDate = new Date(gameDate);
endDate.setHours(endDate.getHours() + 1);
const endHour = endDate.getHours();
const endMinute = endDate.getMinutes();
const endAmPm = endHour >= 12 ? 'pm' : 'am';
const endHour12 = endHour % 12 || 12;
const endTime = `${endHour12}:${endMinute.toString().padStart(2, '0')}${endAmPm}`;
// Result: "10:00pm"

// Team size
const teamSize = game.max_players / 2; // 18 → 9
```

**Deadline formatting:**
```typescript
const deadline = new Date(game.registration_window_end);
const deadlineDay = deadline.getDate();
const deadlineDayWithOrdinal = getOrdinalSuffix(deadlineDay); // "18th"
const deadlineWeekday = deadline.toLocaleDateString('en-GB', { weekday: 'long' });
const deadlineMonth = deadline.toLocaleDateString('en-GB', { month: 'long' });
const deadlineDatePart = `${deadlineWeekday} ${deadlineDayWithOrdinal} ${deadlineMonth}`;

const deadlineHour = deadline.getHours();
const deadlineMinute = deadline.getMinutes();
const deadlineAmPm = deadlineHour >= 12 ? 'pm' : 'am';
const deadlineHour12 = deadlineHour % 12 || 12;
const deadlineTime = `${deadlineHour12}:${deadlineMinute.toString().padStart(2, '0')}${deadlineAmPm}`;
const deadlineFormatted = `${deadlineDatePart} at ${deadlineTime}`;
// Result: "Saturday 18th October at 1:00pm"
```

### Announcement Message Format

```typescript
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

// Add token-eligible players if any
if (tokenEligible && tokenEligible.length > 0) {
  message += '\n\n';
  message += 'The following players, react with 🪙 if you want to guarantee a spot this week (but you likely won\'t get a spot next week):\n\n';

  tokenEligible.forEach(player => {
    message += `🪙 ${player.friendly_name}\n`;
  });
}

// Add deadline
message += `\n\nRegistration closes ${deadlineFormatted}`;
```

### Store Sent Message

```typescript
const sentMessage = await whatsappClient.sendMessage(groupId, message);
const messageId = sentMessage.id._serialized;

await supabase
  .from('bot_messages')
  .insert({
    message_id: messageId,
    game_id: game.id,
    message_type: 'announcement',
    message_content: message,
    sent_to: groupId,
    success: true
  });
```

---

## 🎯 Admin Commands Implementation

### `/adminhelp` Command

**No database query needed** - static response:

```typescript
const response = `🔧 WNF Bot - Admin Commands

📋 Game Management
/listgames - List all upcoming games
/announce <position> - Announce a game to the group

📝 Usage Examples
/listgames - See all upcoming games
/announce 1 - Announce the 1st game in the list
/announce 2 - Announce the 2nd game in the list

💡 Send these commands as a DM to the bot.
💡 Use the list position (1, 2, 3...), not the game number!`;
```

### `/listgames` Command

**Query:**
```typescript
const { data: games } = await supabase
  .from('games')
  .select(`
    id,
    sequence_number,
    date,
    status,
    registration_window_start,
    registration_window_end
  `)
  .gte('date', new Date().toISOString())
  .order('date', { ascending: true })
  .limit(10);

// Format response
let response = '📋 Upcoming Games\n\n';

games?.forEach((game, index) => {
  const gameDate = new Date(game.date);
  const dateStr = gameDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = gameDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const regStart = new Date(game.registration_window_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const regEnd = new Date(game.registration_window_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  response += `${index + 1}. WNF #${game.sequence_number}\n`;
  response += `   📅 ${dateStr} at ${timeStr}\n`;
  response += `   🎮 Status: ${game.status}\n`;
  response += `   📝 Reg: ${regStart} - ${regEnd}\n\n`;
});

response += `Use /announce <position> to announce a game.\n`;
response += `Example: /announce 1 to announce WNF #${games[0].sequence_number}`;
```

### `/announce <position>` Command

**Parse command:**
```typescript
const match = message.body.match(/^\/announce\s+(\d+)/);
if (!match) {
  return 'Usage: /announce <position>\nExample: /announce 1';
}

const position = parseInt(match[1]);
```

**Get game by position:**
```typescript
const { data: games } = await supabase
  .from('games')
  .select('*')
  .eq('status', 'open')
  .gte('date', new Date().toISOString())
  .order('date', { ascending: true });

if (!games || games.length === 0) {
  return '❌ No open games found.';
}

if (position < 1 || position > games.length) {
  return `❌ Position ${position} not found. Only ${games.length} game(s) available.\n\nUse /listgames to see all games.`;
}

const game = games[position - 1]; // Array is 0-indexed
```

**Then generate announcement** (use format from above)

---

## 🎮 Player Registration via Reactions

### Detect 👍 Reaction

**WhatsApp event:**
```typescript
client.on('message_reaction', async (reaction) => {
  if (reaction.reaction !== '👍') return;

  const messageId = reaction.id.id; // WhatsApp message ID
  const senderId = reaction.senderId; // Format: 447123456789@c.us

  // Convert to E.164
  const phoneNumber = '+' + senderId.split('@')[0];

  // Find which game this announcement is for
  const { data: botMessage } = await supabase
    .from('bot_messages')
    .select('game_id')
    .eq('message_id', messageId)
    .eq('message_type', 'announcement')
    .single();

  if (!botMessage) return; // Not a game announcement

  // Find player
  const { data: player } = await supabase
    .from('players')
    .select('id, friendly_name')
    .eq('whatsapp_mobile_number', phoneNumber)
    .single();

  if (!player) {
    // Player not found - send help message
    await whatsappClient.sendMessage(senderId,
      '❌ Your WhatsApp number is not linked. Visit https://wnf.app/profile to link it.');
    return;
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from('game_registrations')
    .select('id')
    .eq('game_id', botMessage.game_id)
    .eq('player_id', player.id)
    .maybeSingle();

  if (existing) {
    return; // Already registered
  }

  // Register player
  await supabase
    .from('game_registrations')
    .insert({
      game_id: botMessage.game_id,
      player_id: player.id,
      status: 'registered',
      selection_method: 'whatsapp_reaction'
    });

  // Log interaction
  await supabase
    .from('bot_interactions')
    .insert({
      player_id: player.id,
      phone_number: phoneNumber,
      interaction_type: 'reaction',
      response: 'Registered for game',
      success: true
    });
});
```

---

## 💡 Feature Suggestions Based on Available Data

### 1. Payment Reminders

**Data available:**
- `games.pitch_cost` (NUMERIC)
- `games.payment_link` (TEXT)
- `game_registrations.paid` (BOOLEAN)

**Suggested command:** `/payment` or `/pay`

**Query unpaid games:**
```typescript
const { data: unpaidGames } = await supabase
  .from('game_registrations')
  .select(`
    game_id,
    games (
      sequence_number,
      date,
      pitch_cost,
      payment_link
    )
  `)
  .eq('player_id', playerId)
  .eq('status', 'selected')
  .eq('paid', false)
  .order('games.date', { ascending: true });
```

### 2. Win Rate Calculator

**Data available:**
- `player_stats.win_rate` (already calculated!)

**Query:**
```typescript
const { data } = await supabase
  .from('player_stats')
  .select('win_rate, caps')
  .eq('id', playerId)
  .single();

// Convert to percentage
const winRatePercent = Math.round(data.win_rate * 100);
```

### 3. Team Announcements

**Data available:**
- `games.teams_announced` (BOOLEAN)
- `game_registrations.team` ('blue', 'orange', NULL)

**Query players by team:**
```typescript
const { data: blueTeam } = await supabase
  .from('game_registrations')
  .select(`
    players (friendly_name)
  `)
  .eq('game_id', gameId)
  .eq('team', 'blue')
  .eq('status', 'selected');

const { data: orangeTeam } = await supabase
  .from('game_registrations')
  .select(`
    players (friendly_name)
  `)
  .eq('game_id', gameId)
  .eq('team', 'orange')
  .eq('status', 'selected');
```

### 4. Player Rankings

**Data available:**
- Multiple rating columns: `attack_rating`, `defense_rating`, `game_iq`, `gk`

**Suggested command:** `/rank <type>`

**Example:** `/rank attack`, `/rank defense`, `/rank gk`

### 5. Recent Form

**Data available:**
- `player_stats.current_streak`
- `player_stats.max_streak`

**Suggested response format:**
```
🔥 Your Recent Form

Current Streak: 5 games
Best Streak: 12 games
Status: 🔥 On fire!
```

---

## 🔐 Admin Authorization

**Environment variable:** `ADMIN_PHONE_NUMBERS`

**Format:** Comma-separated E.164 numbers:
```env
ADMIN_PHONE_NUMBERS=+447400055259,+447123456789
```

**Check if admin:**
```typescript
function isAdmin(phoneNumber: string): boolean {
  const adminNumbers = process.env.ADMIN_PHONE_NUMBERS?.split(',') || [];
  return adminNumbers.includes(phoneNumber);
}

// Extract phone from WhatsApp sender ID
const phoneNumber = '+' + message.from.split('@')[0];

if (!isAdmin(phoneNumber)) {
  return; // Ignore command from non-admin
}
```

**Route admin DMs:**
```typescript
// In handleMessage
const isDirectMessage = !message.from.endsWith('@g.us');
const phoneNumber = '+' + message.from.split('@')[0];

if (isDirectMessage && isAdmin(phoneNumber)) {
  // Route to admin command handler
  await adminCommandHandler.handle(message);
} else if (message.from === groupId) {
  // Route to player command handler
  await playerCommandHandler.handle(message);
}
```

---

## 📝 Implementation Checklist

### Phase 2A: Admin Commands
- [ ] Create `src/config/admin.ts` - Parse ADMIN_PHONE_NUMBERS
- [ ] Create `src/handlers/admin-command-handler.ts`
  - [ ] `/adminhelp` - Static response
  - [ ] `/listgames` - Query games
  - [ ] `/announce <position>` - Generate + send announcement
- [ ] Create `src/services/announcement.service.ts`
  - [ ] `generateGameAnnouncement(game)` - Format message
  - [ ] `getTokenEligiblePlayers()` - Query eligible players
- [ ] Update `src/whatsapp-client.ts`
  - [ ] Route admin DMs to admin handler
  - [ ] Keep group messages for player commands

### Phase 2B: Player Commands
- [ ] Create `src/handlers/command-handler.ts`
  - [ ] `/xp` - Query `player_stats` view
  - [ ] `/stats` - Query `player_stats` + `players`
  - [ ] `/tokens` - Query token eligibility
  - [ ] `/shields` - Query `players.shield_*` columns
  - [ ] `/nextgame` - Query next game
  - [ ] `/help` - Static list

### Phase 2C: Reaction Registration
- [ ] Create `src/handlers/reaction-handler.ts`
  - [ ] Detect 👍 on tracked announcements
  - [ ] Match player by `whatsapp_mobile_number`
  - [ ] Check registration window
  - [ ] Insert into `game_registrations`
  - [ ] Log to `bot_interactions`

### Phase 2D: Token Integration
- [ ] Detect 🪙 reaction (priority token)
- [ ] Call `use_player_token` RPC
- [ ] Set `using_token: true` in registration
- [ ] Detect 🛡️ message (shield token)
- [ ] Call `use_shield_token` RPC

---

## 🎨 Response Formatting

### Emoji Guide

**Game Info:**
- 📅 Date
- ⏰ Time
- 🎮 Game number
- 📍 Location
- ⚽ Players
- 🔗 Link

**Player Stats:**
- 🎮 XP
- 🏆 Win rate
- 🔥 Streak
- ⭐ Best streak
- 🎯 Caps
- 🛡️ Shields
- 🪙 Tokens

**Status:**
- ✅ Success
- ❌ Error
- ⚠️ Warning
- 💡 Tip

---

**Last Updated:** 2025-10-21
**Created By:** Web App Claude Code (with database access)
**For:** Bot Claude Code implementation
**Status:** Ready for implementation
