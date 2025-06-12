# Registration Streak Bonus Fix

## Issue
The registration streak bonus was incorrectly implemented - it only applied when ALL games in a player's registration streak were reserve games. This meant players like Jude (8-game streak, selected in games 1-7, reserve in game 8) didn't get the bonus.

## Intent
The registration streak bonus is designed to help reserve players who consistently register but don't get selected. It provides a temporary XP boost that may help them reach the threshold for random selection vs XP merit selection.

## Fix Applied
Modified the `player_current_registration_streak_bonus` view to check if the player is a reserve in the LATEST game only, not all games in their streak.

### Before
```sql
-- Bonus only applied if ALL games in streak were reserve games
CASE 
    WHEN cs.all_reserve AND cs.all_registered THEN true
    ELSE false
END AS bonus_applies
```

### After
```sql
-- Bonus applies if player is reserve in latest game and has been registering consistently
CASE 
    WHEN cs.is_reserve_in_latest_game AND cs.all_registered THEN true
    ELSE false
END AS bonus_applies
```

## Side Effects
The `player_xp_breakdown` view and dependent views (`lewis_xp_breakdown`, `zhao_xp_breakdown`) were dropped when using CASCADE. They were recreated with the same structure.

### Additional Fix Required
The `player_xp_breakdown` view was missing `reserve_games` and `reserve_xp` columns that PlayerProfile.tsx expected. The view was updated to include:
- `reserve_games` - Count of games where player was a reserve
- `reserve_xp` - Total XP from reserve appearances (5 XP per game)

This ensures the Player Profile page loads correctly without errors.

## Result
- Players now correctly receive registration streak bonus when they're reserves, regardless of their status in previous games
- Example: Jude (8-game streak, reserve in game 50) now gets 20% bonus (8 × 2.5%)
- Example: Zhao (1-game streak, reserve in game 50) gets 2.5% bonus (1 × 2.5%)

## Documentation Updated
- XPSystemExplained.md - Added registration streak bonus section
- PlayerCard.md - Updated registration streak documentation
- CLAUDE.md - Added registration streak to XP system and reserve system

## Frontend Fix Applied
The frontend was not fetching registration streak data from the database, causing the bonus to not display in the XP Breakdown component.

### Changes to Profile.tsx
Added fetching of registration streak data:
```typescript
// Fetch registration streak data
const { data: streakData } = await supabase
  .from('player_current_registration_streak_bonus')
  .select('current_streak_length, bonus_applies')
  .eq('friendly_name', playerData.friendly_name)
  .maybeSingle();

// In profile data:
registrationStreak: registrationStreakData?.current_streak_length || 0,
registrationStreakApplies: registrationStreakData?.bonus_applies || false,
```

### Changes to PlayerProfile.tsx
Fixed hardcoded values (0 and false) by adding the same registration streak fetching logic.

### Additional Frontend Fixes
- Added unpaid games count fetching from `player_unpaid_games_view`
- Fixed bench_warmer_streak to be fetched from `players` table instead of `player_xp_breakdown`

### Test Case
For player Zhao with:
- Base XP: 256
- Reserve XP: 5
- Reserve Streak: 1 (+5%)
- Registration Streak: 1 (+2.5%)

Before fix: 274 XP (missing registration streak)
After fix: 281 XP (correct calculation: 261 × 1.075)

## Date
December 6, 2025