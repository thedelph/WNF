# Shield Token UI Messaging Fix

**Date**: 2026-01-30
**Issue**: GameRegistration component incorrectly displayed "You're using a shield token for this game" for players with frozen streaks from previous games
**Root Cause**: UI logic conflated player-level `shield_active` flag with game-specific shield usage
**Status**: ✅ Resolved

---

## Problem Analysis

### Symptoms

Players like Chris were seeing:
- "You're using a shield token for this game" message on Game #82
- Registration button disabled
- Unable to register for the game

Despite:
- Having NO shield token usage record for Game #82
- Only having a frozen streak from a previous game (Game #78)

### Database Evidence (Chris's Case)

```sql
-- Player-level flag (indicates frozen streak exists)
players.shield_active = true

-- Shield usage for Game #78 (January 7) - PREVIOUS game
shield_token_usage: { game_id: 78, is_active: false }

-- Shield usage for Game #82 (current) - NO RECORD EXISTS
shield_token_usage: (no record)
```

### Root Cause: Two Concepts Being Conflated

The `GameRegistration.tsx` component was using `shieldStatus?.shieldActive` for all shield-related UI decisions. This flag represents:

| Concept | What It Actually Means |
|---------|------------------------|
| `shield_active` (player-level) | Player has a frozen streak being protected - could be from weeks ago |
| `shield_token_usage` for THIS game | Player actively used a shield for THIS specific game |

The UI was treating these as the same thing, causing incorrect messaging and button states.

### Comparison with ShieldTokenButton

The `ShieldTokenButton.tsx` component already handled this correctly by querying `shield_token_usage` for the specific game (lines 54-73):

```typescript
// Check if player has an active shield for this game
useEffect(() => {
  const checkActiveShield = async () => {
    const { data, error } = await supabase
      .from('shield_token_usage')
      .select('id')
      .eq('player_id', playerId)
      .eq('game_id', gameId)
      .eq('is_active', true)
      .maybeSingle();

    setHasActiveShield(!!data);
  };
  checkActiveShield();
}, [playerId, gameId]);
```

---

## Solution

Updated `GameRegistration.tsx` to check for game-specific shield usage instead of relying on the player-level `shieldActive` flag.

### Changes Made

#### 1. Added Game-Specific State

```typescript
const [hasShieldForThisGame, setHasShieldForThisGame] = useState(false);
```

#### 2. Added useEffect to Query Game-Specific Shield

```typescript
// Check if player has an active shield for THIS specific game
useEffect(() => {
  const checkShieldForGame = async () => {
    if (!playerId || !game.id) return;

    const { data, error } = await supabase
      .from('shield_token_usage')
      .select('id')
      .eq('player_id', playerId)
      .eq('game_id', game.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      setHasShieldForThisGame(true);
    } else {
      setHasShieldForThisGame(false);
    }
  };

  checkShieldForGame();
}, [playerId, game.id]);
```

#### 3. Updated handleShieldUsed Callback

```typescript
const handleShieldUsed = async () => {
  // Re-check shield for this specific game
  const { data } = await supabase
    .from('shield_token_usage')
    .select('id')
    .eq('player_id', playerId)
    .eq('game_id', game.id)
    .eq('is_active', true)
    .maybeSingle();

  setHasShieldForThisGame(!!data);
  await refreshShieldStatus();
  await onRegistrationChange();
};
```

#### 4. Updated All UI Conditions

| Location | Before | After |
|----------|--------|-------|
| TokenToggle visibility | `!shieldStatus?.shieldActive` | `!hasShieldForThisGame` |
| Registration button disabled | `shieldStatus?.shieldActive` | `hasShieldForThisGame` |
| "Using shield for this game" message | `shieldStatus?.shieldActive` | `hasShieldForThisGame` |
| Shield section visibility | `shieldStatus.tokensAvailable > 0 \|\| shieldStatus.shieldActive` | `shieldStatus.tokensAvailable > 0 \|\| hasShieldForThisGame` |
| "Can't play this week?" prompt | `!shieldStatus.shieldActive` | `!hasShieldForThisGame` |
| "Streak is protected" message | `shieldStatus.shieldActive` | `hasShieldForThisGame` |
| ShieldTokenButton disabled | `isUserRegistered && !shieldStatus.shieldActive` | `isUserRegistered && !hasShieldForThisGame` |

---

## Files Modified

1. **`src/components/game/GameRegistration.tsx`**
   - Added `hasShieldForThisGame` state
   - Added useEffect to check game-specific shield usage
   - Updated `handleShieldUsed` to refresh game-specific state
   - Updated all UI conditions to use `hasShieldForThisGame`

2. **`docs/fixes/ShieldTokenUIMessagingFix.md`**
   - This documentation

---

## Testing Instructions

### Scenario 1: Player with Frozen Streak (No Shield for Current Game)

1. Log in as a player with `shield_active = true` but no shield used for current game
2. Navigate to the current game page
3. Verify:
   - ✅ Registration button is **enabled**
   - ✅ No "You're using a shield token for this game" message
   - ✅ Shield section shows option to use a shield (if tokens available)
   - ✅ ShieldTokenDisplay shows frozen streak info

### Scenario 2: Player Uses Shield for Current Game

1. Log in as a player with shield tokens available
2. Navigate to current game and use a shield
3. Verify:
   - ✅ "You're using a shield token for this game" message appears
   - ✅ Registration button becomes **disabled**
   - ✅ "Your streak is protected for this game" message appears
   - ✅ Cancel Shield button is visible

### Scenario 3: Player Cancels Shield

1. From Scenario 2, click "Cancel Shield"
2. Verify:
   - ✅ Registration button becomes **enabled** again
   - ✅ Shield-related messages disappear
   - ✅ "Can't play this week? Protect your streak:" prompt returns

### Database Verification

```sql
-- Check shield usage for a specific player and game
SELECT
  p.friendly_name,
  p.shield_active as has_frozen_streak,
  stu.game_id,
  stu.is_active as shield_active_for_game,
  g.game_number
FROM players p
LEFT JOIN shield_token_usage stu ON stu.player_id = p.id
LEFT JOIN games g ON g.id = stu.game_id
WHERE p.friendly_name = 'Chris'
ORDER BY g.game_number DESC;
```

---

## Impact

**Before fix:**
- ❌ Players with frozen streaks couldn't register for new games
- ❌ Confusing "using shield for this game" message when no shield was used
- ❌ Registration button incorrectly disabled

**After fix:**
- ✅ Players with frozen streaks can register normally
- ✅ Shield messages only appear when shield is actually used for current game
- ✅ Registration button correctly reflects game-specific shield state
- ✅ Consistent behavior with ShieldTokenButton component

---

## Related Documentation

- `/docs/ShieldTokenSystem.md` - Complete shield token system documentation
- `/docs/fixes/RegistrationClosePlayerSelectionFix.md` - Related registration fixes
