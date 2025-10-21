# Token Eligibility - Correct Query

**Date:** 2025-10-21
**Status:** ✅ CORRECTED

---

## ⚠️ CORRECTION TO BOT_TECHNICAL_SPEC.md

**Line 348 of BOT_TECHNICAL_SPEC.md is INCORRECT.**

The `public_player_token_status` materialized view **DOES EXIST**.

---

## ✅ Correct Query for Token-Eligible Players

### Materialized View: `public_player_token_status`

**Purpose:** Pre-calculated token eligibility status for all players

**Columns:**
- `player_id` - UUID
- `token_status` - TEXT ('AVAILABLE', 'USED', 'INELIGIBLE')
- `is_eligible` - BOOLEAN (✅ Use this!)
- `last_used_at` - TIMESTAMPTZ
- `next_token_at` - TEXT
- `created_at` - TIMESTAMPTZ

### Simple Query

**TypeScript (Supabase):**
```typescript
const { data: tokenEligiblePlayers, error } = await supabase
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

// Result:
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

**Raw SQL (for reference):**
```sql
SELECT
  pts.player_id,
  pts.token_status,
  pts.is_eligible,
  p.friendly_name,
  p.whatsapp_mobile_number
FROM public_player_token_status pts
INNER JOIN players p ON pts.player_id = p.id
WHERE pts.is_eligible = true
  AND p.whatsapp_mobile_number IS NOT NULL
  AND p.whatsapp_group_member = 'Yes'
ORDER BY p.friendly_name ASC;
```

---

## 🎯 Usage in Game Announcements

When generating announcements, use this to get the token list:

```typescript
// Get token-eligible players
const { data: tokenPlayers } = await supabase
  .from('public_player_token_status')
  .select(`
    players!inner (
      friendly_name,
      whatsapp_mobile_number
    )
  `)
  .eq('is_eligible', true)
  .eq('players.whatsapp_group_member', 'Yes')
  .not('players.whatsapp_mobile_number', 'is', null)
  .order('players(friendly_name)', { ascending: true });

// Build token section
if (tokenPlayers && tokenPlayers.length > 0) {
  message += '\n\n';
  message += 'The following players, react with 🪙 if you want to guarantee a spot this week (but you likely won\'t get a spot next week):\n\n';

  tokenPlayers.forEach(tp => {
    message += `🪙 ${tp.players.friendly_name}\n`;
  });
}
```

---

## 📊 What the View Does

The materialized view uses the `check_token_eligibility()` RPC function to determine:

1. Has player played in last 10 games?
2. Has player NOT been selected in last 3 games?
3. Does player have no outstanding unpaid games?
4. Is player a WhatsApp group member?

**All logic is handled by the database** - the bot just queries `is_eligible = true`.

---

## 🔄 Refresh Frequency

Since this is a **materialized view**, it's pre-calculated and cached.

**When it refreshes:** Check with your database admin, but typically:
- After game completion
- After player selection
- After token usage
- On a schedule (hourly/daily)

**If you need live data:**
```sql
REFRESH MATERIALIZED VIEW public_player_token_status;
```

But for announcements, cached data is fine since token eligibility doesn't change minute-to-minute.

---

## ❌ DO NOT Use This Complex Query

**Delete the complex query in BOT_TECHNICAL_SPEC.md lines 348-385.**

That was based on the incorrect assumption that the view didn't exist.

---

## ✅ Final Implementation

**For game announcements:**
```typescript
// Simple query - just check is_eligible = true
const { data: tokenEligible } = await supabase
  .from('public_player_token_status')
  .select(`
    players!inner (friendly_name)
  `)
  .eq('is_eligible', true)
  .eq('players.whatsapp_group_member', 'Yes')
  .not('players.whatsapp_mobile_number', 'is', null)
  .order('players(friendly_name)');
```

**That's it!** No complex logic needed in the bot.

---

**Last Updated:** 2025-10-21
**Correction to:** BOT_TECHNICAL_SPEC.md (Section: Get token-eligible players)
**Status:** ✅ Ready to use
