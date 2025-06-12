# Database View Dependencies

## Overview
This document tracks the dependencies between database views in the WNF system. Understanding these dependencies is crucial when modifying views to avoid breaking dependent objects.

## View Dependency Tree

### player_current_registration_streak_bonus
**Dependent Views:**
- `lewis_xp_breakdown` (via player_xp_breakdown)
- `zhao_xp_breakdown` (via player_xp_breakdown)
- `player_xp_breakdown` (via functions that reference it)

**Dependencies:**
- `players` table
- `games` table
- `game_registrations` table

### player_xp_breakdown
**Dependent Views:**
- `lewis_xp_breakdown` - Player-specific view for Lewis
- `zhao_xp_breakdown` - Player-specific view for Zhao

**Dependencies:**
- `players` table
- `game_registrations` table
- `games` table
- `player_xp` table

**Used By:**
- PlayerProfile component (reserve_games, reserve_xp)
- usePlayerGrid hook (unpaid_games_count, unpaid_games_modifier)

### player_xp
**Type:** Table (not a view)

**Dependent Objects:**
- `player_xp_breakdown` view
- Multiple functions that calculate XP

### player_streak_stats
**Type:** View

**Dependencies:**
- `players` table
- `games` table
- `game_registrations` table

**Used By:**
- usePlayerGrid hook (longest_streak data)
- PlayerProfile component

## CASCADE Effects

When dropping views with CASCADE, the following will occur:

### Dropping player_current_registration_streak_bonus
```sql
DROP VIEW player_current_registration_streak_bonus CASCADE;
```
Will also drop:
- Any views that calculate XP breakdowns using registration streak data
- Possibly player_xp_breakdown if it references this view

### Dropping player_xp_breakdown
```sql
DROP VIEW player_xp_breakdown CASCADE;
```
Will also drop:
- `lewis_xp_breakdown`
- `zhao_xp_breakdown`
- Any other player-specific XP breakdown views

## Best Practices

1. **Before Dropping Views:**
   - Check for dependent views using:
   ```sql
   SELECT dependent_ns.nspname as dependent_schema,
          dependent_view.relname as dependent_view,
          source_ns.nspname as source_schema,
          source_table.relname as source_table
   FROM pg_depend 
   JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
   JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
   JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
   JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
   JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
   WHERE source_table.relname = 'your_view_name'
   AND source_ns.nspname = 'public';
   ```

2. **When Using CASCADE:**
   - Document all views that will be dropped
   - Have CREATE statements ready for all dependent views
   - Test in a development environment first

3. **Alternative to CASCADE:**
   - Create new view with a temporary name
   - Update dependent views to use new view
   - Drop old view
   - Rename new view to original name

## Common Dependency Chains

### XP Calculation Chain
1. Base tables: `players`, `games`, `game_registrations`
2. Calculation views: `player_current_registration_streak_bonus`
3. Summary views: `player_xp_breakdown`
4. Player-specific views: `lewis_xp_breakdown`, `zhao_xp_breakdown`

### Streak Calculation Chain
1. Base tables: `players`, `games`, `game_registrations`
2. Calculation view: `player_streak_stats`
3. Used by components directly (no dependent views)

## Recovery Procedures

If views are accidentally dropped:

1. **Check for CREATE statements in:**
   - Migration files
   - Database documentation
   - Git history

2. **Standard Recreation Order:**
   ```sql
   -- 1. Base calculation views
   CREATE OR REPLACE VIEW player_current_registration_streak_bonus AS ...
   
   -- 2. Summary views
   CREATE OR REPLACE VIEW player_xp_breakdown AS ...
   
   -- 3. Player-specific views
   CREATE OR REPLACE VIEW lewis_xp_breakdown AS ...
   CREATE OR REPLACE VIEW zhao_xp_breakdown AS ...
   ```

## Related Documentation
- [Player XP Breakdown View](./PlayerXPBreakdownView.md)
- [Database Functions](../DatabaseFunctions.md)
- [XP System Explained](../XPSystemExplained.md)