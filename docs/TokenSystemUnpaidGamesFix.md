# Token System Unpaid Games Fix

## Issue: Incorrect Unpaid Games Count for Token Eligibility

### Problem Description
The token system was incorrectly showing 1 unpaid game for all players in the database, regardless of whether they actually had unpaid games. This affected:

1. The "No outstanding payments" eligibility criterion for priority tokens
2. Display of unpaid games count in player profiles
3. Token eligibility determination for all players

### Root Cause Analysis
The issue was found in the `useTokenStatus` hook:

1. The hook was querying the `game_registrations` table directly with insufficient filtering:
   ```typescript
   // Original query - too broad
   .from('game_registrations')
   .select('id')
   .eq('player_id', playerId)
   .eq('status', 'selected')
   .eq('paid', false)
   ```

2. This query did not match the logic in the `player_unpaid_games_view` database view, which only counts games that are:
   - Historical
   - Completed
   - More than 24 hours old

3. Since the default value for the `paid` column in `game_registrations` is `false`, all new registrations start as unpaid, causing the hook to count games that shouldn't be considered "unpaid" for token eligibility purposes.

### Solution Implemented

The following changes were made to fix the issue:

1. Updated the query in `useTokenStatus.ts` to match the logic in the `player_unpaid_games_view`:
   ```typescript
   // Updated query - properly filtered
   .from('game_registrations')
   .select('id, games!inner(id, date, is_historical, completed)')
   .eq('player_id', playerId)
   .eq('status', 'selected')
   .eq('paid', false)
   .filter('games.is_historical', 'eq', true)
   .filter('games.completed', 'eq', true)
   .filter('games.date', 'lt', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
   ```

2. Improved the display logic in `TokenStatus.tsx` to:
   - Only show the unpaid count when `hasOutstandingPayments` is true AND `outstandingPaymentsCount` is greater than 0
   - Add null/undefined checks to prevent TypeScript errors

### Verification
The fix was verified by:
1. Confirming that players without actual unpaid historical games no longer show as having unpaid games
2. Ensuring that players with legitimate unpaid historical games still show the correct count
3. Verifying that token eligibility is now correctly determined based on the actual unpaid games status

### Documentation Updates
This document serves as a record of the fix. The main TokenSystem.md documentation remains accurate as it already correctly described the "No outstanding payments" criterion for token eligibility.

### Related Components
- `src/hooks/useTokenStatus.ts` - Updated to correctly query unpaid games
- `src/components/profile/TokenStatus.tsx` - Improved display logic for unpaid games count
- `src/pages/Profile.tsx` and `src/pages/PlayerProfile.tsx` - Benefit from the fixed token status display

### Consistency with XP System
This fix ensures consistency with the XP system, which already correctly uses the `player_xp_breakdown` view to apply the -50% XP penalty for unpaid games.

### Related Fixes

- **[Unpaid Games Data Source Fix](fixes/UnpaidGamesDataSourceFix.md)** (January 2026) - Extended the same approach to `useGameRegistrationStats` hook, ensuring all hooks use `player_xp_breakdown` view as the authoritative source for unpaid games data.
