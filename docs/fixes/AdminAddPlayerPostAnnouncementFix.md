# Admin Add Player Post-Announcement Fix

**Date**: 2026-01-21
**Issue**: Players added by admins after the `players_announced` phase were incorrectly set with `status: 'registered'` instead of `status: 'selected'`
**Status**: ✅ Fixed

---

## Problem Description

When an admin added a player to a game after the registration window had closed (during `players_announced` or `teams_announced` phases), the player was being added with:
- `status: 'registered'`
- `selection_method: 'none'`

This was incorrect because:
1. Players added after announcement should automatically be considered **selected** (since they're being added to fill a slot)
2. Using `status: 'registered'` meant the player wouldn't appear in the selected players list
3. The player would be in an inconsistent state - registered but not part of the game's participant list

---

## Root Cause

The `handleRegister` function in `GameRegistrations.tsx` was using hardcoded values for all registrations regardless of game phase:

```typescript
// Before fix - always used these values
const { error: insertError } = await supabaseAdmin
  .from('game_registrations')
  .insert(
    newPlayerIds.map(playerId => ({
      game_id: gameId,
      player_id: playerId,
      status: 'registered',        // Always 'registered'
      selection_method: 'none',    // Always 'none'
      team: null,
      created_at: new Date().toISOString()
    }))
  );
```

---

## Solution

The fix adds phase-aware logic to determine the correct status and selection method based on the current game phase:

### Code Changes

**File**: `src/components/admin/games/GameRegistrations.tsx` (lines 458-476)

```typescript
// Determine status based on game phase
// If game is past announcement, add players directly as selected
const isPostAnnouncement = ['players_announced', 'teams_announced'].includes(gameStatus);
const insertStatus = isPostAnnouncement ? 'selected' : 'registered';
const insertMethod = isPostAnnouncement ? 'merit' : 'none';

// Insert only new registrations using admin client
const { error: insertError } = await supabaseAdmin
  .from('game_registrations')
  .insert(
    newPlayerIds.map(playerId => ({
      game_id: gameId,
      player_id: playerId,
      status: insertStatus,           // 'selected' if post-announcement
      selection_method: insertMethod, // 'merit' if post-announcement
      team: null,
      created_at: new Date().toISOString()
    }))
  );
```

### UI Updates

The button text also reflects the phase-aware behavior:

```typescript
{['players_announced', 'teams_announced'].includes(gameStatus)
  ? `Add to Selected (${selectedPlayerIds.length})`
  : `Register Selected (${selectedPlayerIds.length})`}
```

---

## Behavior Summary

| Game Phase | Status Set | Selection Method | Button Text |
|------------|------------|------------------|-------------|
| `open` | `registered` | `none` | "Register Selected (N)" |
| `players_announced` | `selected` | `merit` | "Add to Selected (N)" |
| `teams_announced` | `selected` | `merit` | "Add to Selected (N)" |

---

## Why `merit` for Selection Method?

When an admin adds a player after announcement, the player is being added to fill a vacancy or as a last-minute addition. Using `merit` as the selection method:

1. **Consistency**: Aligns with how automatic merit-based selection works
2. **Clarity**: Distinguishes admin-added players from random selections
3. **Data Integrity**: Ensures the player appears correctly in selection results
4. **Audit Trail**: Makes it clear the player was added through normal game flow (not via random lottery)

---

## Verification Steps

### Manual Testing

1. Create a game with registration window in the past
2. Let the game transition to `players_announced` status
3. Open the Game Registrations modal
4. Select an unregistered player and click "Add to Selected"
5. Verify the player appears with:
   - Status badge showing "Merit"
   - Listed in the selected players section

### Database Verification

```sql
-- Check player registration status after admin add
SELECT
  gr.status,
  gr.selection_method,
  p.friendly_name,
  g.status as game_status
FROM game_registrations gr
JOIN players p ON p.id = gr.player_id
JOIN games g ON g.id = gr.game_id
WHERE gr.game_id = '[game-id]'
ORDER BY gr.created_at DESC;
```

---

## Related Documentation

- **[Player Selection Explained](../PlayerSelectionExplained.md)** - Complete player selection mechanics
- **[Registration Close Player Selection Fix](RegistrationClosePlayerSelectionFix.md)** - Related automated selection fix
- **[Game Flow](../GameFlow.md)** - Game lifecycle and status transitions
