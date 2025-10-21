# Database Schema Reference - WhatsApp Bot

**Date:** 2025-10-20
**Purpose:** Complete database schema reference for bot development
**Supabase URL:** `https://jvdhauvwaowmzbwtpaym.supabase.co`

---

## 📋 Table of Contents
1. [Players Table](#players-table)
2. [Bot Messages Table](#bot-messages-table)
3. [Bot Interactions Table](#bot-interactions-table)
4. [Related Tables](#related-tables)
5. [RPC Functions](#rpc-functions)
6. [Queries & Examples](#queries--examples)

---

## Players Table

### Schema

```sql
-- Relevant columns for bot integration
players (
  id                      UUID PRIMARY KEY,
  user_id                 UUID REFERENCES auth.users,
  friendly_name           TEXT NOT NULL,
  whatsapp_mobile_number  TEXT,              -- E.164 format
  whatsapp_group_member   TEXT,              -- 'Yes', 'No', or 'Proxy'
  xp                      INTEGER DEFAULT 0,
  caps                    INTEGER DEFAULT 0,
  current_streak          INTEGER DEFAULT 0,
  shield_tokens_available INTEGER DEFAULT 0,
  -- ... other columns
)
```

### WhatsApp Columns

#### `whatsapp_mobile_number` (TEXT, nullable)
- **Format:** E.164 international format
- **Examples:** `+447123456789`, `+12025551234`
- **Purpose:** Link WhatsApp user to player account
- **Current data:** 25 of 67 players (37%) have numbers

#### `whatsapp_group_member` (TEXT, nullable)
- **Values:** `'Yes'`, `'No'`, `'Proxy'`, or NULL
- **Purpose:** Track group membership status
- **Current data:** 31 marked as 'Yes', 0 as 'Proxy'

### Query Examples

```sql
-- Find player by WhatsApp number
SELECT id, friendly_name, user_id, whatsapp_mobile_number
FROM players
WHERE whatsapp_mobile_number = '+447123456789';

-- Get all players with WhatsApp numbers
SELECT friendly_name, whatsapp_mobile_number, whatsapp_group_member
FROM players
WHERE whatsapp_mobile_number IS NOT NULL
ORDER BY friendly_name;

-- Count group members
SELECT
  COUNT(*) as total,
  COUNT(whatsapp_mobile_number) as with_numbers,
  COUNT(CASE WHEN whatsapp_group_member = 'Yes' THEN 1 END) as group_members
FROM players;
```

### RLS Policies

**SELECT:**
- ✅ All authenticated users can view player data
- ✅ Service role has full access

**UPDATE:**
- ✅ Players can update their own record
- ✅ Admins can update any record
- ✅ Service role has full access

---

## Bot Messages Table

### Schema

```sql
CREATE TABLE bot_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id      VARCHAR(255) NOT NULL UNIQUE,
  game_id         UUID REFERENCES games(id) ON DELETE SET NULL,
  message_type    VARCHAR(50) NOT NULL,
  message_content TEXT,
  sent_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_to         VARCHAR(50),
  success         BOOLEAN DEFAULT true,
  error_message   TEXT
);
```

### Column Details

#### `message_id` (VARCHAR(255), unique, not null)
- **Purpose:** WhatsApp's message ID for linking reactions
- **Format:** WhatsApp's internal format (varies)
- **Example:** `true_120363...@g.us_AC3030...`
- **Usage:** Link reactions back to specific announcements

#### `game_id` (UUID, nullable, foreign key)
- **Purpose:** Link message to specific game
- **References:** `games(id)`
- **Behavior:** SET NULL on game deletion
- **Usage:** Filter messages by game

#### `message_type` (VARCHAR(50), not null)
- **Purpose:** Categorize message types
- **Valid values:**
  - `announcement` - Game registration announcement
  - `player_selection` - Selected players message
  - `team_announcement` - Team allocation message
  - `reminder` - General reminder
- **Usage:** Filter queries, analytics

#### `message_content` (TEXT, nullable)
- **Purpose:** Store the actual message text
- **Usage:** Debugging, resending, analytics
- **Note:** Can be null for privacy

#### `sent_to` (VARCHAR(50), nullable)
- **Purpose:** Recipient (group ID or individual phone)
- **Format:** WhatsApp group ID or phone number
- **Example:** `120363423276603282@g.us`
- **Usage:** Track where message was sent

#### `success` (BOOLEAN, default true)
- **Purpose:** Track send success/failure
- **Usage:** Error monitoring, retry logic

#### `error_message` (TEXT, nullable)
- **Purpose:** Store error details if success = false
- **Usage:** Debugging failed sends

### Indexes

```sql
CREATE INDEX idx_bot_messages_game_id ON bot_messages(game_id);
CREATE INDEX idx_bot_messages_type ON bot_messages(message_type);
CREATE INDEX idx_bot_messages_sent_at ON bot_messages(sent_at DESC);
CREATE INDEX idx_bot_messages_message_id ON bot_messages(message_id);
```

### RLS Policies

```sql
-- Admins can view all
CREATE POLICY "Admins can view all bot messages"
  ON bot_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN admin_roles ar ON p.id = ar.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Service role can insert
CREATE POLICY "Service role can insert bot messages"
  ON bot_messages FOR INSERT TO service_role
  WITH CHECK (true);

-- Service role can update (for error tracking)
CREATE POLICY "Service role can update bot messages"
  ON bot_messages FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);
```

### Usage Examples

```typescript
// Store sent message
await supabase
  .from('bot_messages')
  .insert({
    message_id: whatsappMessageId,
    game_id: gameId,
    message_type: 'announcement',
    message_content: messageText,
    sent_to: groupId,
    success: true
  });

// Find game from reaction
const { data } = await supabase
  .from('bot_messages')
  .select('game_id')
  .eq('message_id', reactionMessageId)
  .eq('message_type', 'announcement')
  .maybeSingle();

// Get recent announcements
const { data } = await supabase
  .from('bot_messages')
  .select('*')
  .eq('message_type', 'announcement')
  .order('sent_at', { ascending: false })
  .limit(10);

// Mark message as failed
await supabase
  .from('bot_messages')
  .update({
    success: false,
    error_message: errorText
  })
  .eq('id', messageId);
```

---

## Bot Interactions Table

### Schema

```sql
CREATE TABLE bot_interactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id        UUID REFERENCES players(id) ON DELETE SET NULL,
  phone_number     VARCHAR(20),
  interaction_type VARCHAR(50) NOT NULL,
  command          VARCHAR(100),
  message_content  TEXT,
  response         TEXT,
  success          BOOLEAN DEFAULT true,
  error_message    TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Column Details

#### `player_id` (UUID, nullable, foreign key)
- **Purpose:** Link to player account
- **References:** `players(id)`
- **Behavior:** SET NULL on player deletion
- **Note:** Can be NULL if player not found

#### `phone_number` (VARCHAR(20), nullable)
- **Purpose:** Store phone even if player not found
- **Format:** E.164 (+447123456789)
- **Usage:** Analytics, debugging unlinked users

#### `interaction_type` (VARCHAR(50), not null)
- **Valid values:**
  - `command` - User sent a command
  - `reaction` - User reacted to message
  - `message` - General message
- **Usage:** Analytics, filtering

#### `command` (VARCHAR(100), nullable)
- **Purpose:** Store command used
- **Format:** Include slash (e.g., `/xp`, `/stats`)
- **Usage:** Command popularity analytics

#### `message_content` (TEXT, nullable)
- **Purpose:** Original message text
- **Privacy:** Use sparingly, only for debugging
- **Note:** Can be null for privacy

#### `response` (TEXT, nullable)
- **Purpose:** What bot replied
- **Usage:** Analytics, debugging, improving responses

#### `success` (BOOLEAN, default true)
- **Purpose:** Track if interaction succeeded
- **Usage:** Error rate monitoring

#### `error_message` (TEXT, nullable)
- **Purpose:** Store error details
- **Usage:** Debugging, improving error handling

### Indexes

```sql
CREATE INDEX idx_bot_interactions_player_id ON bot_interactions(player_id);
CREATE INDEX idx_bot_interactions_type ON bot_interactions(interaction_type);
CREATE INDEX idx_bot_interactions_created_at ON bot_interactions(created_at DESC);
CREATE INDEX idx_bot_interactions_command ON bot_interactions(command) WHERE command IS NOT NULL;
CREATE INDEX idx_bot_interactions_phone ON bot_interactions(phone_number) WHERE phone_number IS NOT NULL;
```

### RLS Policies

```sql
-- Admins can view all
CREATE POLICY "Admins can view all bot interactions"
  ON bot_interactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN admin_roles ar ON p.id = ar.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Players can view their own
CREATE POLICY "Players can view their own bot interactions"
  ON bot_interactions FOR SELECT TO authenticated
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Service role can insert
CREATE POLICY "Service role can insert bot interactions"
  ON bot_interactions FOR INSERT TO service_role
  WITH CHECK (true);
```

### Usage Examples

```typescript
// Log command interaction
await supabase
  .from('bot_interactions')
  .insert({
    player_id: playerId,
    phone_number: phoneNumber,
    interaction_type: 'command',
    command: '/xp',
    response: responseText,
    success: true
  });

// Log failed interaction
await supabase
  .from('bot_interactions')
  .insert({
    player_id: null,  // Player not found
    phone_number: phoneNumber,
    interaction_type: 'command',
    command: '/stats',
    success: false,
    error_message: 'Player not linked'
  });

// Get command usage stats
const { data } = await supabase
  .from('bot_interactions')
  .select('command')
  .eq('interaction_type', 'command')
  .gte('created_at', '2025-10-01');

// Get player's interaction history
const { data } = await supabase
  .from('bot_interactions')
  .select('*')
  .eq('player_id', playerId)
  .order('created_at', { ascending: false })
  .limit(20);
```

---

## Related Tables

### Games Table

```sql
games (
  id                        UUID PRIMARY KEY,
  date                      TIMESTAMP WITH TIME ZONE,
  status                    VARCHAR(50),
  max_players               INTEGER,
  registration_window_start TIMESTAMP WITH TIME ZONE,
  registration_window_end   TIMESTAMP WITH TIME ZONE,
  -- ... other columns
)
```

**Bot usage:**
- Check registration window times
- Get game details for announcements
- Link messages to games

### Game Registrations Table

```sql
game_registrations (
  id         UUID PRIMARY KEY,
  game_id    UUID REFERENCES games(id),
  player_id  UUID REFERENCES players(id),
  status     VARCHAR(50),  -- 'selected', 'reserve', 'registered'
  team       VARCHAR(10),  -- 'blue', 'orange', null
  using_token BOOLEAN DEFAULT false,
  -- ... other columns
)
```

**Bot usage:**
- Register players via reaction
- Check if already registered
- Query selected players

---

## RPC Functions

### `use_player_token`

```sql
use_player_token(
  p_player_id UUID,
  p_game_id UUID
) RETURNS BOOLEAN
```

**Purpose:** Consume a player's priority token
**Returns:** `true` if successful, `false` if no token available
**Usage:** Called when player reacts with 👍🪙

**Example:**
```typescript
const { data, error } = await supabase.rpc('use_player_token', {
  p_player_id: playerId,
  p_game_id: gameId
});

if (data === true) {
  // Token used successfully
  // Now register player
}
```

### `use_shield_token`

```sql
use_shield_token(
  p_player_id UUID,
  p_game_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
```

**Purpose:** Use a shield token to protect streak
**Returns:** `true` if successful, `false` if no shield available
**Usage:** Called when player sends 🛡️

**Example:**
```typescript
const { data, error } = await supabase.rpc('use_shield_token', {
  p_player_id: playerId,
  p_game_id: gameId,
  p_user_id: userId
});

if (data === true) {
  // Shield activated
  // Notify player
}
```

---

## Queries & Examples

### Common Query Patterns

#### Find Active Game

```typescript
const { data: game } = await supabase
  .from('games')
  .select('*')
  .eq('status', 'open')
  .gte('registration_window_end', new Date().toISOString())
  .order('date', { ascending: true })
  .limit(1)
  .maybeSingle();
```

#### Check Registration Window

```typescript
function isRegistrationOpen(game: any): boolean {
  const now = new Date();
  const start = new Date(game.registration_window_start);
  const end = new Date(game.registration_window_end);

  return now >= start && now <= end && game.status === 'open';
}
```

#### Get Player Stats

```typescript
const { data } = await supabase
  .from('players')
  .select(`
    id,
    friendly_name,
    xp,
    caps,
    current_streak,
    shield_tokens_available
  `)
  .eq('id', playerId)
  .single();
```

#### Check if Already Registered

```typescript
const { data } = await supabase
  .from('game_registrations')
  .select('id')
  .eq('player_id', playerId)
  .eq('game_id', gameId)
  .maybeSingle();

const isRegistered = !!data;
```

---

## Data Types & Formats

### Phone Numbers
- **Format:** E.164
- **Pattern:** `^\+[1-9]\d{1,14}$`
- **Examples:** `+447123456789`, `+12025551234`

### WhatsApp IDs
- **Format:** `{number}@{domain}`
- **Examples:**
  - Individual: `447123456789@c.us`
  - Group: `120363423276603282@g.us`

### Timestamps
- **Type:** `TIMESTAMP WITH TIME ZONE`
- **Format:** ISO 8601
- **Example:** `2025-10-20T12:44:58.845Z`

### UUIDs
- **Type:** `UUID`
- **Format:** Version 4 UUID
- **Example:** `550e8400-e29b-41d4-a716-446655440000`

---

## Error Handling

### Common Errors

```typescript
// Player not found
{
  code: 'PGRST116',
  message: 'The result contains 0 rows',
  details: null
}

// Unique constraint violation
{
  code: '23505',
  message: 'duplicate key value violates unique constraint',
  details: 'Key (message_id)=(...) already exists.'
}

// Foreign key violation
{
  code: '23503',
  message: 'insert or update on table violates foreign key constraint',
  details: 'Key (player_id)=(...) is not present in table "players".'
}
```

### Best Practices

```typescript
// Always use try-catch
try {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('whatsapp_mobile_number', phone)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    // Player not found - handle gracefully
    return null;
  }

  return data;
} catch (error) {
  console.error('Database error:', error);
  // Log to bot_interactions with success: false
}
```

---

**Last Updated:** 2025-10-20
**Maintained By:** Web App Team
**Supabase Project:** jvdhauvwaowmzbwtpaym
