# Web App Handover - WhatsApp Bot Integration

**Date:** 2025-10-20
**From:** Web App Team (Claude Code Instance)
**To:** Bot Development Team
**Status:** ✅ All web app preparation COMPLETE

---

## 🎉 Executive Summary

The web app is **fully ready** for WhatsApp Bot Phase 2 implementation. All database tables, UI components, and integration points are in place and tested.

**Key Achievements:**
- ✅ Database tables created (`bot_messages`, `bot_interactions`)
- ✅ Player self-service WhatsApp number management
- ✅ Comprehensive help/documentation page
- ✅ 25 of 67 players already have phone numbers stored
- ✅ RLS policies configured for service role access

**You can now proceed with Phase 2 command and reaction handlers.**

---

## 📊 Database Status

### Existing Tables (Ready to Use)

#### **`players` Table**
Already has WhatsApp columns - **NO MIGRATION NEEDED**

```sql
-- Columns available:
whatsapp_mobile_number    TEXT    -- E.164 format (+447123456789)
whatsapp_group_member     TEXT    -- 'Yes', 'No', or 'Proxy'

-- Current data:
Total players: 67
With phone numbers: 25 (37%)
Group members (Yes): 31 (46%)
Group members (Proxy): 0
```

**Sample data:**
```
Phil R:    +447561315106   (Yes)
Jarman:    +447572235038   (Yes)
Jack G:    +447930615734   (Yes)
Zhao:      +447875953741   (Yes)
Joe:       +447494267678   (Yes)
```

#### **`bot_messages` Table** ✅ NEW
Tracks all messages sent by the bot for reaction handling

```sql
CREATE TABLE bot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id VARCHAR(255) NOT NULL UNIQUE,  -- WhatsApp message ID
  game_id UUID REFERENCES games(id),
  message_type VARCHAR(50) NOT NULL,        -- 'announcement', 'player_selection', etc.
  message_content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_to VARCHAR(50),                      -- Group ID or phone number
  success BOOLEAN DEFAULT true,
  error_message TEXT
);
```

**Indexes:**
- `idx_bot_messages_game_id` - Fast game lookups
- `idx_bot_messages_type` - Filter by message type
- `idx_bot_messages_sent_at` - Chronological queries
- `idx_bot_messages_message_id` - Unique constraint + fast lookups

**RLS Policies:**
- ✅ Admins can SELECT all messages
- ✅ Service role can INSERT messages
- ✅ Service role can UPDATE messages (for error tracking)

#### **`bot_interactions` Table** ✅ NEW
Audit log of all bot interactions for analytics

```sql
CREATE TABLE bot_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id),
  phone_number VARCHAR(20),                 -- E.164 format
  interaction_type VARCHAR(50) NOT NULL,    -- 'command', 'reaction', 'message'
  command VARCHAR(100),                     -- e.g., '/xp', '/stats'
  message_content TEXT,
  response TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
- `idx_bot_interactions_player_id` - Player-specific queries
- `idx_bot_interactions_type` - Filter by interaction type
- `idx_bot_interactions_created_at` - Chronological queries
- `idx_bot_interactions_command` - Command analytics
- `idx_bot_interactions_phone` - Phone number lookups

**RLS Policies:**
- ✅ Admins can SELECT all interactions
- ✅ Players can SELECT their own interactions
- ✅ Service role can INSERT interactions

### RPC Functions (Already Available)

```sql
-- Token management (already tested and working)
use_player_token(p_player_id UUID, p_game_id UUID)
use_shield_token(p_player_id UUID, p_game_id UUID, p_user_id UUID)
```

---

## 🔌 Integration Points

### 1. Player Identification

**Query pattern:**
```typescript
// Find player by WhatsApp number
const { data: player } = await supabase
  .from('players')
  .select('id, friendly_name, whatsapp_mobile_number, user_id')
  .eq('whatsapp_mobile_number', phoneNumber)  // E.164 format
  .maybeSingle();
```

**Important:**
- Phone numbers are in E.164 format: `+447123456789`
- Use `maybeSingle()` instead of `single()` to avoid errors when player not found
- 25 players already have numbers - ready for testing!

### 2. Message Tracking

**When sending announcements:**
```typescript
// 1. Send message via WhatsApp
const messageId = await whatsappClient.sendMessage(groupId, messageText);

// 2. Store in database for reaction tracking
await supabase
  .from('bot_messages')
  .insert({
    message_id: messageId,           // WhatsApp's ID
    game_id: gameId,                 // Link to game
    message_type: 'announcement',    // Or 'player_selection', 'team_announcement'
    message_content: messageText,
    sent_to: groupId,
    success: true
  });
```

**When handling reactions:**
```typescript
// Find which game announcement was reacted to
const { data: botMessage } = await supabase
  .from('bot_messages')
  .select('game_id')
  .eq('message_id', reactionMessageId)
  .eq('message_type', 'announcement')
  .maybeSingle();
```

### 3. Interaction Logging

**Log every interaction:**
```typescript
await supabase
  .from('bot_interactions')
  .insert({
    player_id: playerId,           // UUID (can be null)
    phone_number: phoneNumber,     // Store even if player not found
    interaction_type: 'command',   // or 'reaction', 'message'
    command: '/xp',                // The command used (if applicable)
    response: responseText,        // What bot replied
    success: true,                 // or false if error
    error_message: errorText       // null if success
  });
```

**Analytics queries:**
```sql
-- Most used commands
SELECT command, COUNT(*) as usage_count
FROM bot_interactions
WHERE interaction_type = 'command'
GROUP BY command
ORDER BY usage_count DESC;

-- Error rate by command
SELECT command,
  COUNT(*) FILTER (WHERE success = false) as errors,
  COUNT(*) as total
FROM bot_interactions
WHERE interaction_type = 'command'
GROUP BY command;
```

---

## 🎨 User Interface Updates

### Player Profile Page
**URL:** `/profile`

**New Section Added:** WhatsApp Bot Integration

**Features:**
- Display current WhatsApp number
- Edit/update WhatsApp number with validation
- Set group member status (Yes/No/Proxy)
- E.164 format validation (+country code)
- Real-time error feedback
- Info box explaining bot benefits
- Link to help documentation

**Flow:**
1. Player clicks "Link WhatsApp Number"
2. Selects group member status
3. Enters phone number (if status = "Yes")
4. System validates E.164 format
5. Saves to `players.whatsapp_mobile_number`
6. Player can now use bot!

### Help/Documentation Page
**URL:** `/help/whatsapp-bot`

**Content:**
- Quick start guide (4 steps)
- Registration instructions (👍 reaction)
- Priority token usage (👍 + 🪙)
- Shield token usage (🛡️)
- All bot commands with examples
- Setup instructions with phone format examples
- FAQ section
- Troubleshooting tips

**Purpose:**
- Onboard new users
- Reference for existing users
- Reduce support burden

---

## 🔐 Security & Permissions

### Service Role Key Usage

Your bot uses the **service role key** to bypass RLS policies. This is correct and expected.

**✅ Allowed operations:**
- INSERT into `bot_messages`
- UPDATE `bot_messages` (for error tracking)
- INSERT into `bot_interactions`
- SELECT from `players` (to find by phone)
- EXECUTE RPC functions (`use_player_token`, `use_shield_token`)

**❌ Do NOT:**
- Expose service role key in logs
- Include it in error messages sent to users
- Commit it to version control

### Data Privacy

**Logged data:**
- ✅ Phone numbers (for player matching)
- ✅ Commands used
- ✅ Success/failure status
- ✅ Timestamps

**NOT logged:**
- ❌ Full message content (except bot responses)
- ❌ Personal conversations
- ❌ Unrelated WhatsApp data

---

## 📝 Implementation Checklist for Bot Phase 2

### Command Handlers

```typescript
// Example: /xp command handler
async handleXPCommand(msg: Message, player: Player) {
  // 1. Get player XP from database
  const { data } = await supabase
    .from('player_xp')
    .select('xp')
    .eq('id', player.id)
    .single();

  // 2. Format response
  const response = `🎮 Your XP: ${data.xp.toLocaleString()}`;

  // 3. Send reply
  await msg.reply(response);

  // 4. Log interaction
  await supabase
    .from('bot_interactions')
    .insert({
      player_id: player.id,
      phone_number: formatPhoneNumber(msg.from),
      interaction_type: 'command',
      command: '/xp',
      response: response,
      success: true
    });
}
```

### Reaction Handler

```typescript
async handleReaction(reaction: any) {
  // 1. Check if thumbs up
  if (reaction.emoji !== '👍') return;

  // 2. Find which game announcement
  const { data: botMessage } = await supabase
    .from('bot_messages')
    .select('game_id')
    .eq('message_id', reaction.messageId)
    .eq('message_type', 'announcement')
    .maybeSingle();

  if (!botMessage) return;

  // 3. Find player by phone
  const phone = formatPhoneNumber(reaction.senderId);
  const { data: player } = await supabase
    .from('players')
    .select('id, friendly_name')
    .eq('whatsapp_mobile_number', phone)
    .maybeSingle();

  if (!player) {
    // Send help message about linking account
    return;
  }

  // 4. Check registration window
  // 5. Register player
  // 6. Log interaction
}
```

---

## 🧪 Testing Data

### Test Players with WhatsApp Numbers

Use these for testing (real data from production):

```javascript
const testPlayers = [
  { name: 'Phil R', phone: '+447561315106', status: 'Yes' },
  { name: 'Jarman', phone: '+447572235038', status: 'Yes' },
  { name: 'Jack G', phone: '+447930615734', status: 'Yes' },
  { name: 'Zhao', phone: '+447875953741', status: 'Yes' },
  { name: 'Joe', phone: '+447494267678', status: 'Yes' }
];
```

### Database Queries for Testing

```sql
-- Check if player has WhatsApp number
SELECT friendly_name, whatsapp_mobile_number, whatsapp_group_member
FROM players
WHERE whatsapp_mobile_number IS NOT NULL
LIMIT 10;

-- Check bot message tracking
SELECT message_id, game_id, message_type, sent_at
FROM bot_messages
ORDER BY sent_at DESC
LIMIT 10;

-- Check interaction logs
SELECT player_id, interaction_type, command, success, created_at
FROM bot_interactions
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚠️ Important Notes

### Phone Number Format

**CRITICAL:** Always use E.164 format

```javascript
// ✅ CORRECT
'+447123456789'  // UK
'+12025551234'   // US
'+33123456789'   // France

// ❌ WRONG
'07123456789'    // Missing country code
'447123456789'   // Missing + sign
'+44 7123 456789' // Has spaces
```

**Conversion function needed:**
```typescript
function formatPhoneNumber(whatsappId: string): string {
  // WhatsApp IDs are like: 447123456789@c.us
  // Need to convert to: +447123456789
  const number = whatsappId.split('@')[0];
  return `+${number}`;
}
```

### Group ID

Your bot is configured with: `120363423276603282@g.us`

This is correct and matches the WNF WhatsApp group.

### Message Types

When storing messages, use these types:
- `announcement` - Game announcements (for registration)
- `player_selection` - Selected players announcement
- `team_announcement` - Team allocation
- `reminder` - General reminders

### Interaction Types

When logging interactions, use:
- `command` - User sent a command (/xp, /stats, etc.)
- `reaction` - User reacted to a message (👍, 🪙, 🛡️)
- `message` - General message (not a command)

---

## 🚀 Ready to Proceed

**What's Done:**
- ✅ Database tables created and tested
- ✅ RLS policies configured
- ✅ Player UI for self-service
- ✅ Help documentation
- ✅ 25 players ready for testing

**What You Need to Do:**
1. Implement command handlers using the patterns above
2. Implement reaction handler for registration
3. Log all interactions to `bot_interactions`
4. Track sent messages in `bot_messages`
5. Test with the 25 players who have phone numbers

**Questions?**
Check the other handover documents:
- `DATABASE_SCHEMA_REFERENCE.md` - Detailed schema info
- `INTEGRATION_EXAMPLES.md` - More code examples

---

**Last Updated:** 2025-10-20
**Contact:** Web App Team
**Status:** ✅ Ready for Phase 2 Implementation
