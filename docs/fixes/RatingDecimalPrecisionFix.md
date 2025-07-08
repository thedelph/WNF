# Player Rating Decimal Precision Fix

## Issue Date
June 27, 2025

## Problem Description
After implementing the Game IQ rating system on June 26, 2025, most player average ratings were incorrectly stored as integers (e.g., 4.0, 6.0, 7.0) instead of maintaining decimal precision (e.g., 4.71, 6.33, 7.83).

## Root Cause
During the Game IQ implementation, there appears to have been a bulk update that rounded average ratings to the nearest integer. This affected the `attack_rating`, `defense_rating`, and `game_iq` columns in the `players` table.

## Investigation
1. **Symptom**: Only one player (Zhao) had non-integer average ratings in the database
2. **Discovery**: Calculated averages from individual ratings didn't match stored values
   - Example: Alex E had stored attack rating of 4.0, but actual average was 3.29
3. **Verification**: The trigger function was correct and properly calculating decimal averages
4. **Pattern**: Players with ratings updated after June 26 had correct decimals (e.g., Zhao)

## Solution
Applied a database migration to recalculate all player average ratings from their individual ratings:

```sql
UPDATE players p
SET 
    attack_rating = COALESCE((
        SELECT AVG(attack_rating)
        FROM player_ratings pr
        WHERE pr.rated_player_id = p.id
    ), p.attack_rating),
    defense_rating = COALESCE((
        SELECT AVG(defense_rating)
        FROM player_ratings pr
        WHERE pr.rated_player_id = p.id
    ), p.defense_rating),
    game_iq = COALESCE((
        SELECT AVG(game_iq_rating)
        FROM player_ratings pr
        WHERE pr.rated_player_id = p.id
    ), p.game_iq),
    average_attack_rating = COALESCE((
        SELECT AVG(attack_rating)
        FROM player_ratings pr
        WHERE pr.rated_player_id = p.id
    ), p.average_attack_rating),
    average_defense_rating = COALESCE((
        SELECT AVG(defense_rating)
        FROM player_ratings pr
        WHERE pr.rated_player_id = p.id
    ), p.average_defense_rating),
    average_game_iq_rating = COALESCE((
        SELECT AVG(game_iq_rating)
        FROM player_ratings pr
        WHERE pr.rated_player_id = p.id
    ), p.average_game_iq_rating)
WHERE EXISTS (
    SELECT 1 FROM player_ratings pr WHERE pr.rated_player_id = p.id
);
```

## Results
### Before Fix
- Alex E: Attack 4.0, Defense 6.0
- Anthony B: Attack 6.0, Defense 7.0  
- Callum: Attack 7.0, Defense 3.0

### After Fix
- Alex E: Attack 3.29, Defense 7.43
- Anthony B: Attack 5.83, Defense 8.17
- Callum: Attack 7.83, Defense 2.83

## Impact
- Restored accurate decimal precision for all player ratings
- Team balancing algorithm now uses more accurate player skill assessments
- Rating displays throughout the application show precise values

## Prevention
- The existing trigger function correctly calculates decimal averages for all new rating updates
- No code changes were needed - the trigger was already working correctly
- Future bulk updates should use the trigger function rather than manual calculations

## Related Files
- Migration: `20250627_recalculate_player_average_ratings`
- Database columns: `players.attack_rating`, `players.defense_rating`, `players.game_iq`
- Trigger function: `update_player_average_ratings()`