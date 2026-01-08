# Dropout with Shield Protection

**Last Updated:** January 7, 2026
**Version:** 1.0

## Overview

The Dropout with Shield feature allows players to drop out of a game while optionally using a Shield Token to protect their streak. This provides flexibility for unavoidable absences while maintaining the XP system's integrity.

## How It Works

### Without Shield

When a player drops out **without** using a shield:
- Their status changes to `dropped_out`
- Their streak resets to 0 when the game completes
- They lose their accumulated XP bonus

### With Shield

When a player drops out **with** a shield:
- A Shield Token is consumed
- Their streak is protected with gradual decay
- When they return, the protected bonus decays gradually

## User Flow

1. Player clicks "Drop Out" on game page
2. Modal shows current streak and XP bonus
3. If shields available, option to use one is shown
4. Player confirms dropout with or without shield
5. System processes the dropout via `dropout_with_shield()` RPC

## Database Function

### dropout_with_shield

```sql
dropout_with_shield(
  p_player_id: UUID,
  p_game_id: UUID,
  p_use_shield: BOOLEAN,
  p_admin_id: UUID  -- NULL for player-initiated
)

Returns: { success: boolean, message: string }
```

**What it does:**
1. Validates the player is registered for the game
2. Updates registration status to `dropped_out`
3. If shield used:
   - Records shield usage
   - Sets up streak protection
4. Creates slot offers for reserve players (if player was selected)

## UI Component

### DropoutConfirmModal

**Location:** `src/components/game/DropoutConfirmModal.tsx`

**Props:**
```typescript
interface DropoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  gameId: string;
  currentStreak: number;
  shieldTokensAvailable: number;
  onDropoutComplete: () => void;
}
```

**Features:**
- Shows current streak and XP bonus percentage
- Toggle to use or not use shield (if available)
- Visual feedback on protection status
- Warning when not using shield
- Streak bonus calculation using XP v2 formula

## Streak Bonus Calculation

The modal displays the XP bonus using the v2 diminishing returns formula:

```typescript
const calculateStreakBonus = (streak: number): number => {
  if (streak <= 0) return 0;
  if (streak <= 10) {
    // 10% + 9% + 8% + ... + (11 - streak)%
    return (streak * 11 - (streak * (streak + 1)) / 2) / 100;
  }
  // After 10 games: +1% per game
  return (55 + (streak - 10)) / 100;
};
```

## Shield Protection Details

When a shield is used:
- Original streak value is stored
- Gradual decay is applied when player returns
- Convergence point = ceil(originalStreak / 2)

**Example:** 10-game streak protected
- Game 1: Natural 1, Protected 9 = effective +90%
- Game 3: Natural 3, Protected 7 = effective +70%
- Game 5: Natural 5, Protected 5 = converged, shield removed
- Game 6: Natural 6 = normal +60%

See: [Shield Token System](/docs/TokenSystem.md#shield-tokens)

## Slot Offers

When a **selected** player drops out:
- Reserve players are automatically notified
- Slot offers are created via the slot offer system
- First reserve to accept gets the spot

When a **reserve** player drops out:
- No slot offers created
- Simply removed from reserve list

## Related Utilities

### dropout/index.ts

Main export file for dropout utilities:

```typescript
import {
  handlePlayerSelfDropout,
  handlePlayerDropoutAndOffers
} from './dropout';
```

### handlePlayerSelfDropout

For player-initiated dropouts:

```typescript
const result = await handlePlayerSelfDropout(playerId, gameId);
```

### handlePlayerDropoutAndOffers

For admin-initiated dropouts:

```typescript
const result = await handlePlayerDropoutAndOffers(gameId, playerId, new Date());
```

## Related Documentation

- [Shield Token System](/docs/TokenSystem.md#shield-tokens) - How shields protect streaks
- [XP System v2](/docs/features/XPSystemv2.md) - Streak bonus calculations
- [Shield Convergence Timing Fix](/docs/fixes/ShieldConvergenceTimingFix.md) - Related bug fix
