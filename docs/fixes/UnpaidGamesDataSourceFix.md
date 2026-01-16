# Unpaid Games Data Source Fix

**Date**: 2026-01-16
**Author**: Claude Code
**Issue**: Player cards showing "Unpaid Games -50%" on RegisteredPlayers page but not on PlayerList page

## Problem

The `useGameRegistrationStats` hook was fetching unpaid games data from the `players` table columns (`unpaid_games`, `unpaid_games_modifier`), while `usePlayerGrid` fetched from `player_xp_breakdown` view. The `players` table contained stale data, causing inconsistent displays.

| Page | Hook | Data Source | Issue |
|------|------|-------------|-------|
| RegisteredPlayers | `useGameRegistrationStats` | `players` table | Stale data (showed 1 unpaid) |
| PlayerList | `usePlayerGrid` | `player_xp_breakdown` view | Correct data (showed 0 unpaid) |

## Root Cause

The `players.unpaid_games` column is a legacy field that was not being updated correctly. The `player_xp_breakdown` view dynamically calculates the correct unpaid games count based on actual `game_registrations` data.

## Solution

1. **Updated hook query** - Changed `useGameRegistrationStats` to:
   - Add `friendly_name` to the players query (needed for view lookup)
   - Remove stale `unpaid_games` and `unpaid_games_modifier` columns from players query
   - Add new query to fetch from `player_xp_breakdown` view

2. **Created lookup map** - `unpaidGamesMap` keyed by `friendly_name`

3. **Updated stats calculation** - Use view data instead of players table

4. **Cleared stale data** - Set Chris's `unpaid_games` to 0 in players table

## Files Modified

- `src/hooks/useGameRegistrationStats.ts` (lines ~76-98, ~133-141, ~273-280, ~350-379)

## Database Fix Applied

```sql
UPDATE players
SET unpaid_games = 0, unpaid_games_modifier = 0
WHERE friendly_name = 'Chris';
```

## Verification

Both data sources now show consistent values:
- `players` table: `unpaid_games = 0`
- `player_xp_breakdown` view: `unpaid_games_count = 0`

## Related Documentation

- [player_xp_breakdown View](../database/PlayerXPBreakdownView.md) - Authoritative source for unpaid games
- [Token System Unpaid Games Fix](../TokenSystemUnpaidGamesFix.md) - Similar fix for useTokenStatus hook
- [Recent Games Query Limit Fix](RecentGamesQueryLimitFix.md) - Similar data source consolidation
