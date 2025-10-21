# Token Ineligibility DM Messages

**Date:** 2025-10-21 (Updated: 2025-10-21)
**Purpose:** Guide for WhatsApp bot to send helpful DM messages when players react with 🪙 but aren't eligible for priority tokens

---

## ⚠️ IMPORTANT UPDATE

**The `check_player_token` RPC does NOT return detailed eligibility breakdown.**

It only returns `{has_token: boolean, expires_at: timestamp}`.

To get eligibility details, you **must use manual queries** as shown in this document.

---

## Overview

When a player reacts with 🪙 to a game announcement but isn't eligible for a priority token, the bot should send them a **private DM** explaining exactly why they're not eligible and when they might become eligible.

---

## Token Eligibility Criteria

A player is eligible for a priority token when **ALL** of these are true:

1. ✅ **Has played in last 10 games**
2. ✅ **Has NOT been selected in last 3 games** (been sitting out)
3. ✅ **No outstanding unpaid games**
4. ✅ **Is a WhatsApp group member** (whatsapp_group_member = 'Yes' or 'Proxy')

---

## Database Query for Eligibility Check

### Simple Check (Using Materialized View)

```typescript
// Check if player is eligible (returns boolean)
const { data: tokenStatus } = await supabase
  .from('public_player_token_status')
  .select('is_eligible, token_status')
  .eq('player_id', playerId)
  .maybeSingle();

if (!tokenStatus?.is_eligible) {
  // Player is NOT eligible - need to find out why
}
```

### Detailed Check (Manual Queries)

**⚠️ IMPORTANT:** The `check_player_token` RPC only returns `{has_token, expires_at}`, NOT eligibility details.

You must manually query each criterion:

```typescript
async function getDetailedEligibility(playerId: string): Promise<{
  is_whatsapp_member: boolean;
  has_played_in_last_10: boolean;
  was_selected_recently: boolean;
  has_outstanding_payments: boolean;
  outstanding_payment_count: number;
  is_eligible: boolean;
} | null> {
  try {
  // 1. Get player info
  const { data: player } = await supabase
    .from('players')
    .select('whatsapp_group_member')
    .eq('id', playerId)
    .single();

  const isWhatsAppMember = ['Yes', 'Proxy'].includes(player?.whatsapp_group_member);

  // 2. Get latest completed game sequence number
  const { data: latestGame } = await supabase
    .from('games')
    .select('sequence_number')
    .eq('completed', true)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single();

  const latestSeq = latestGame?.sequence_number || 0;

  // 3. Check if played in last 10 games
  const { data: last10Games } = await supabase
    .from('game_registrations')
    .select('game_id, games!inner(sequence_number)')
    .eq('player_id', playerId)
    .eq('status', 'selected')
    .eq('games.completed', true)
    .gt('games.sequence_number', latestSeq - 10);

  const hasPlayedInLast10 = (last10Games?.length || 0) > 0;

  // 4. Check if selected in last 3 games
  const { data: last3Games } = await supabase
    .from('game_registrations')
    .select('game_id, games!inner(sequence_number)')
    .eq('player_id', playerId)
    .eq('status', 'selected')
    .eq('games.completed', true)
    .gt('games.sequence_number', latestSeq - 3);

  const wasSelectedRecently = (last3Games?.length || 0) > 0;

  // 5. Check unpaid games
  const { data: unpaidData } = await supabase
    .from('token_eligibility_unpaid_games_view')
    .select('count')
    .eq('player_id', playerId)
    .maybeSingle();

  const unpaidCount = unpaidData?.count || 0;
  const hasOutstandingPayments = unpaidCount > 0;

    return {
      is_whatsapp_member: isWhatsAppMember,
      has_played_in_last_10: hasPlayedInLast10,
      was_selected_recently: wasSelectedRecently,
      has_outstanding_payments: hasOutstandingPayments,
      outstanding_payment_count: unpaidCount,
      is_eligible: isWhatsAppMember && hasPlayedInLast10 && !wasSelectedRecently && !hasOutstandingPayments
    };
  } catch (error) {
    console.error('Error in getDetailedEligibility:', error);
    return null;
  }
}
```

---

## Constructing the DM Message

### Step 1: Identify Why They're Ineligible

```typescript
async function getIneligibilityReasons(playerId: string, playerName: string) {
  // Get detailed eligibility check using manual queries
  const eligibility = await getDetailedEligibility(playerId);

  if (!eligibility) {
    console.error('Error checking token eligibility');
    return null;
  }

  const reasons: string[] = [];

  // Check each criterion
  if (!eligibility.has_played_in_last_10) {
    reasons.push('not_enough_games');
  }

  if (eligibility.was_selected_recently) {
    // was_selected_recently = TRUE means they were selected (disqualifies them)
    reasons.push('recently_selected');
  }

  if (eligibility.has_outstanding_payments) {
    reasons.push('unpaid_games');
  }

  if (!eligibility.is_whatsapp_member) {
    reasons.push('not_whatsapp_member');
  }

  return {
    reasons,
    details: eligibility
  };
}
```

### Step 2: Generate Message Based on Reasons

```typescript
async function generateIneligibilityMessage(
  playerName: string,
  reasons: string[],
  details: any
): Promise<string> {
  let message = `Hi ${playerName} 👋\n\n`;
  message += `You reacted with 🪙 to use a priority token, but you're not currently eligible.\n\n`;
  message += `**Reason${reasons.length > 1 ? 's' : ''}:**\n\n`;

  // Add specific reasons
  for (const reason of reasons) {
    switch (reason) {
      case 'not_enough_games':
        message += `❌ **Not enough recent games**\n`;
        message += `   You need to have played in at least one of the last 10 games.\n`;
        message += `   Priority tokens are for regular players who've been sitting out recently.\n\n`;
        break;

      case 'recently_selected':
        message += `❌ **Recently selected to play**\n`;
        message += `   You were selected for one or more of the last 3 games.\n`;
        message += `   Priority tokens are for players who've been missing out.\n`;
        message += `   You'll become eligible after sitting out 3 consecutive games.\n\n`;
        break;

      case 'unpaid_games':
        const count = details.outstanding_payment_count || 0;
        message += `❌ **Outstanding payments**\n`;
        message += `   You have ${count} unpaid game${count > 1 ? 's' : ''}.\n`;
        message += `   Please settle outstanding payments to become eligible for tokens.\n`;
        message += `   Check https://wnf.app/profile for payment details.\n\n`;
        break;

      case 'not_whatsapp_member':
        message += `❌ **Not a WhatsApp group member**\n`;
        message += `   Priority tokens are only available to WhatsApp group members.\n\n`;
        break;
    }
  }

  message += `---\n\n`;
  message += `**What are priority tokens?**\n`;
  message += `Priority tokens guarantee you a spot in the next game, but you'll likely miss the following game. They help regular players who've been unlucky with selection.\n\n`;
  message += `Check your token status anytime at: https://wnf.app/profile`;

  return message;
}
```

---

## Complete Implementation Example

```typescript
import { supabase } from './supabase-client';
import { whatsappClient } from './whatsapp-client';

/**
 * Handle token reaction from ineligible player
 */
async function handleIneligibleTokenReaction(
  playerId: string,
  playerName: string,
  phoneNumber: string
) {
  try {
    // 1. Get eligibility details using manual queries
    const eligibility = await getDetailedEligibility(playerId);

    if (!eligibility) {
      console.error('Error checking token eligibility');
      // Send generic message
      await whatsappClient.sendMessage(
        phoneNumber,
        `Hi ${playerName}, you're not currently eligible for priority tokens. Check https://wnf.app/profile for details.`
      );
      return;
    }

    // 2. Build list of reasons
    const reasons: string[] = [];

    if (!eligibility.has_played_in_last_10) {
      reasons.push('not_enough_games');
    }

    if (eligibility.was_selected_recently) {
      reasons.push('recently_selected');
    }

    if (eligibility.has_outstanding_payments) {
      reasons.push('unpaid_games');
    }

    if (!eligibility.is_whatsapp_member) {
      reasons.push('not_whatsapp_member');
    }

    // 3. Generate message
    const message = await generateIneligibilityMessage(
      playerName,
      reasons,
      eligibility
    );

    // 4. Send DM
    await whatsappClient.sendMessage(phoneNumber, message);

    console.log(`Sent token ineligibility message to ${playerName}:`, reasons);

    // 5. Log the interaction
    await supabase
      .from('bot_interactions')
      .insert({
        player_id: playerId,
        interaction_type: 'token_ineligibility_dm',
        metadata: {
          reasons,
          eligibility_details: eligibility
        }
      });

  } catch (error) {
    console.error('Error handling ineligible token reaction:', error);
  }
}
```

---

## Integration with Reaction Handler

```typescript
// In reaction-handler.ts

async function handleTokenReaction(
  message: Message,
  reaction: string,
  playerId: string,
  playerData: any
) {
  // Check eligibility first
  const { data: tokenStatus } = await supabase
    .from('public_player_token_status')
    .select('is_eligible')
    .eq('player_id', playerId)
    .maybeSingle();

  if (!tokenStatus?.is_eligible) {
    // Player is NOT eligible - send DM explaining why
    await handleIneligibleTokenReaction(
      playerId,
      playerData.friendly_name,
      playerData.whatsapp_mobile_number
    );

    // Remove the reaction (optional - prevents confusion)
    // await message.removeReaction(reaction);

    return; // Don't process token usage
  }

  // Player IS eligible - proceed with token usage
  await usePlayerToken(playerId, gameId);
  // ... rest of token usage logic
}
```

---

## Message Examples

### Example 1: Recently Selected

```
Hi Nathan 👋

You reacted with 🪙 to use a priority token, but you're not currently eligible.

**Reason:**

❌ **Recently selected to play**
   You were selected for one or more of the last 3 games.
   Priority tokens are for players who've been missing out.
   You'll become eligible after sitting out 3 consecutive games.

---

**What are priority tokens?**
Priority tokens guarantee you a spot in the next game, but you'll likely miss the following game. They help regular players who've been unlucky with selection.

Check your token status anytime at: https://wnf.app/profile
```

### Example 2: Unpaid Games

```
Hi James H 👋

You reacted with 🪙 to use a priority token, but you're not currently eligible.

**Reason:**

❌ **Outstanding payments**
   You have 2 unpaid games.
   Please settle outstanding payments to become eligible for tokens.
   Check https://wnf.app/profile for payment details.

---

**What are priority tokens?**
Priority tokens guarantee you a spot in the next game, but you'll likely miss the following game. They help regular players who've been unlucky with selection.

Check your token status anytime at: https://wnf.app/profile
```

### Example 3: Multiple Reasons

```
Hi Mike M 👋

You reacted with 🪙 to use a priority token, but you're not currently eligible.

**Reasons:**

❌ **Not enough recent games**
   You need to have played in at least one of the last 10 games.
   Priority tokens are for regular players who've been sitting out recently.

❌ **Outstanding payments**
   You have 1 unpaid game.
   Please settle outstanding payments to become eligible for tokens.
   Check https://wnf.app/profile for payment details.

---

**What are priority tokens?**
Priority tokens guarantee you a spot in the next game, but you'll likely miss the following game. They help regular players who've been unlucky with selection.

Check your token status anytime at: https://wnf.app/profile
```

---

## Database Queries Reference

### Manual Eligibility Check (No RPC Available)

**⚠️ CRITICAL:** There is NO RPC function that returns detailed eligibility breakdown.

The `check_player_token` RPC only returns:
```typescript
{
  has_token: boolean,
  expires_at: timestamp | null
}
```

To get eligibility details, you **must** use the `getDetailedEligibility()` function shown above, which manually queries:

1. **`players` table** - for `whatsapp_group_member` status
2. **`games` table** - for latest completed game sequence number
3. **`game_registrations` table (2 queries)** - for last 10 games played and last 3 selections
4. **`token_eligibility_unpaid_games_view`** - for unpaid game count

**Returns:**
```typescript
{
  is_whatsapp_member: boolean,
  has_played_in_last_10: boolean,
  was_selected_recently: boolean,      // TRUE = disqualifies (they played recently)
  has_outstanding_payments: boolean,   // TRUE = disqualifies
  outstanding_payment_count: number,
  is_eligible: boolean
}
```

---

## Error Handling

### What if eligibility check fails?

```typescript
const eligibility = await getDetailedEligibility(playerId);

if (!eligibility) {
  console.error('Error checking token eligibility');

  // Send generic fallback message
  await whatsappClient.sendMessage(
    phoneNumber,
    `Hi ${playerName}, you're not currently eligible for priority tokens. ` +
    `Check https://wnf.app/profile for full details about your token status.`
  );
  return;
}
```

**Note:** The `getDetailedEligibility()` function should have internal try-catch to return `null` on any database error.

### What if player has no phone number?

```typescript
if (!playerData.whatsapp_mobile_number) {
  console.log(`Cannot send DM to ${playerName} - no phone number`);

  // Log the interaction attempt
  await supabase
    .from('bot_interactions')
    .insert({
      player_id: playerId,
      interaction_type: 'token_ineligibility_dm_failed',
      metadata: { reason: 'no_phone_number' }
    });

  return;
}
```

---

## Best Practices

1. **Always check eligibility BEFORE processing token usage**
   - Prevents wasted tokens
   - Provides immediate feedback

2. **Send DM immediately after ineligible reaction**
   - Don't make players wait
   - Clear and helpful messaging

3. **Log all interactions**
   - Track who's trying to use tokens when ineligible
   - Analytics on common ineligibility reasons

4. **Keep messages friendly and helpful**
   - Don't be punitive
   - Explain the "why" behind the rules
   - Provide links to check status

5. **Consider removing the reaction (optional)**
   - Prevents confusion in group chat
   - Makes it clear token wasn't used
   - But might cause notification spam if done too aggressively

---

## Testing

Test with these scenarios:

1. **Player recently selected** - Should mention sitting out 3 games
2. **Player with unpaid games** - Should show count and link to profile
3. **New player** - Should explain need to play in last 10 games
4. **Multiple reasons** - Should list all reasons clearly
5. **Already eligible** - Should NOT send DM, should process token

**Test Query:**
```sql
-- Find players who might react but aren't eligible
SELECT
  p.friendly_name,
  pts.is_eligible,
  pts.token_status,
  p.whatsapp_mobile_number
FROM public_player_token_status pts
INNER JOIN players p ON pts.player_id = p.id
WHERE pts.is_eligible = false
  AND p.whatsapp_mobile_number IS NOT NULL
  AND p.whatsapp_group_member = 'Yes'
ORDER BY p.friendly_name;
```

---

**Last Updated:** 2025-10-21

**Change Log:**
- 2025-10-21: **CORRECTED** - Replaced non-existent `check_player_token` RPC detailed response with manual query approach using `getDetailedEligibility()` function

**Related Documentation:**
- `TOKEN_ELIGIBILITY_QUERY.md` - How to check if eligible
- `BOT_TECHNICAL_SPEC.md` - Main technical specification
- `INTEGRATION_EXAMPLES.md` - Reaction handler examples

**Status:** ✅ Ready to implement (corrected)
