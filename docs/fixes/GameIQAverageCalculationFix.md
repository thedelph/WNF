# All Rating Averages Calculation Fix

## Date: July 8, 2025

## Issue Description
Attack, Defense, and Game IQ ratings were not being averaged correctly. Instead of storing the average of all ratings, the system was storing individual rating values (often the most recent one). This affected multiple players across the system.

### Example Cases:
**Zhao (Game IQ)**
- Individual ratings: 2 (Anthony B), 3 (Chris H), 5 (Dom), 6 (Dave)
- Expected average: 4.0
- Actual stored value: 2.0 (Anthony B's rating)

**Mike M (Attack & Defense)**
- Attack: stored 0.0, should be 5.29 (average of 7 ratings)
- Defense: stored 0.0, should be 3.71 (average of 7 ratings)

## Root Cause
The database trigger function `update_player_average_ratings()` was correctly written and uses AVG() to calculate averages. However, at some point, player values were incorrectly set to individual rating values instead of averages. This was likely due to a bulk update or migration issue.

## Impact
This issue affected many players across all three rating types:

**Attack Rating Issues:**
- Mike M: stored 0.0, should be 5.29
- Justin B: stored 8.0, should be 6.86
- Dave: stored 8.0, should be 7.17

**Defense Rating Issues:**
- Mike M: stored 0.0, should be 3.71
- Jack G: stored 8.0, should be 6.17
- Paul: stored 6.0, should be 7.14

**Game IQ Rating Issues:**
- Zhao: stored 2.0, should be 4.0
- Alex E: stored 4.0, should be 5.75
- Tom K: stored 2.0, should be 5.25

## Fix Applied

### 1. Migration to Recalculate All Averages
Applied the following SQL migration to recalculate all Attack, Defense, and Game IQ averages:

```sql
UPDATE players p
SET 
    attack_rating = COALESCE(attack_avg.avg_attack, 0),
    average_attack_rating = COALESCE(attack_avg.avg_attack, 0),
    defense_rating = COALESCE(defense_avg.avg_defense, 0),
    average_defense_rating = COALESCE(defense_avg.avg_defense, 0),
    game_iq = COALESCE(game_iq_avg.avg_game_iq, 0),
    average_game_iq_rating = COALESCE(game_iq_avg.avg_game_iq, 0)
FROM (
    SELECT 
        rated_player_id,
        AVG(attack_rating) as avg_attack
    FROM player_ratings
    WHERE attack_rating IS NOT NULL
    GROUP BY rated_player_id
) attack_avg
LEFT JOIN (
    SELECT 
        rated_player_id,
        AVG(defense_rating) as avg_defense
    FROM player_ratings
    WHERE defense_rating IS NOT NULL
    GROUP BY rated_player_id
) defense_avg ON attack_avg.rated_player_id = defense_avg.rated_player_id
LEFT JOIN (
    SELECT 
        rated_player_id,
        AVG(game_iq_rating) as avg_game_iq
    FROM player_ratings
    WHERE game_iq_rating IS NOT NULL
    GROUP BY rated_player_id
) game_iq_avg ON attack_avg.rated_player_id = game_iq_avg.rated_player_id
WHERE p.id = attack_avg.rated_player_id
   OR p.id = defense_avg.rated_player_id
   OR p.id = game_iq_avg.rated_player_id;
```

### 2. Trigger Verification
Tested the trigger by updating an existing rating and confirming that the average recalculated correctly. The trigger is working as expected for future updates.

## Prevention
The trigger function is correctly implemented and will maintain proper averages going forward. The issue was a one-time data integrity problem that has been resolved.

## Verification Query
To verify all averages are correct:

```sql
WITH rating_comparison AS (
    SELECT 
        p.id,
        p.friendly_name,
        -- Attack
        p.attack_rating,
        AVG(pr.attack_rating) FILTER (WHERE pr.attack_rating IS NOT NULL) as calc_attack,
        -- Defense
        p.defense_rating,
        AVG(pr.defense_rating) FILTER (WHERE pr.defense_rating IS NOT NULL) as calc_defense,
        -- Game IQ
        p.game_iq,
        AVG(pr.game_iq_rating) FILTER (WHERE pr.game_iq_rating IS NOT NULL) as calc_game_iq
    FROM players p
    LEFT JOIN player_ratings pr ON p.id = pr.rated_player_id
    WHERE p.attack_rating IS NOT NULL 
       OR p.defense_rating IS NOT NULL 
       OR p.game_iq IS NOT NULL
    GROUP BY p.id, p.friendly_name, p.attack_rating, p.defense_rating, p.game_iq
)
SELECT COUNT(*) as players_with_discrepancies
FROM rating_comparison 
WHERE (calc_attack IS NOT NULL AND ABS(attack_rating - calc_attack) > 0.01)
   OR (calc_defense IS NOT NULL AND ABS(defense_rating - calc_defense) > 0.01)
   OR (calc_game_iq IS NOT NULL AND ABS(game_iq - calc_game_iq) > 0.01);
```

This query should return 0 if all averages are correct.