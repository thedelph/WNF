# Rarity Tier System

## Overview

The Rarity Tier system categorises players based on their XP (Experience Points) relative to other players in the system. Each tier represents a percentile range of the player population, with higher tiers representing more accomplished players.

## Rarity Tiers

Players are classified into the following tiers:

| Tier | Percentile | Description |
|------|------------|-------------|
| **Legendary** | Top 2% (98th percentile) | The elite few at the very top of the leaderboard |
| **World Class** | Top 7% (93rd percentile) | Exceptional players with consistent high performance |
| **Professional** | Top 20% (80th percentile) | Accomplished players with significant experience |
| **Semi Pro** | Top 40% (60th percentile) | Established players with moderate experience |
| **Amateur** | Above 0 XP | Players still building their experience (with any XP > 0) |
| **Retired** | 0 XP | Inactive players with 0 XP |

## Implementation Details

### Database Calculation

Rarity tiers are calculated in the database using the `calculate_player_rarity()` function. The function:

1. First identifies all players with 0 XP and assigns them to the "Retired" tier
2. Then calculates percentile ranks only among players with XP > 0
3. Assigns appropriate tiers based on percentile thresholds

```sql
-- Simplified version of the database calculation
BEGIN
  -- Handle players with 0 XP - they get the 'Retired' tier
  UPDATE player_xp
  SET rarity = 'Retired'
  WHERE xp = 0;

  -- Apply percentile rankings only to players with XP > 0
  WITH player_rankings AS (
    SELECT 
      player_id,
      xp,
      CASE
        WHEN percent_rank() OVER (ORDER BY xp DESC) <= 0.02 THEN 'Legendary'
        WHEN percent_rank() OVER (ORDER BY xp DESC) <= 0.07 THEN 'World Class'
        WHEN percent_rank() OVER (ORDER BY xp DESC) <= 0.20 THEN 'Professional'
        WHEN percent_rank() OVER (ORDER BY xp DESC) <= 0.40 THEN 'Semi Pro'
        ELSE 'Amateur'
      END as calculated_rarity
    FROM player_xp
    WHERE xp > 0
  )
  UPDATE player_xp
  SET rarity = pr.calculated_rarity
  FROM player_rankings pr
  WHERE player_xp.player_id = pr.player_id
  AND player_xp.xp > 0;
END;
```

### Frontend Display

Each rarity tier has a distinct visual appearance in the UI:

- **Legendary**: Gold gradient card with animation
- **World Class**: Purple gradient card with animation
- **Professional**: Blue gradient card with animation
- **Semi Pro**: Green gradient card with animation
- **Amateur**: Grey gradient card
- **Retired**: Black card design with light text (no rank shield displayed)

## Rationale for "Retired" Tier

As XP tapers off after 40 games, many inactive players eventually reach 0 XP. The "Retired" tier was introduced to:

1. Clearly distinguish inactive players (0 XP) from active players who are still earning XP
2. Keep the percentile calculations meaningful by only including active players
3. Provide a clean visual separation in the UI between active and inactive players
4. Eliminate confusion by not displaying rank shields on inactive player cards

This prevents the rarity distribution from being skewed by players who are no longer participating, ensuring that the tier system remains relevant and meaningful for active players.

### UI Implementation Details

- Retired player cards use a black background with light text for high visibility and clear distinction
- Rank shields are not displayed on Retired player cards (only active players with XP > 0 show rank shields)
- This implementation maintains UI consistency by avoiding the display of "0" rank for inactive players

## Related Components

- `PlayerCard.tsx` - Implements the visual styling for each rarity tier
- `rarityCalculations.ts` - Contains utility functions for handling rarity values
- `StatsGrid.tsx` - Displays player rarity with appropriate descriptions

## Technical Notes

Rarity tier calculation happens:
1. In the database via the `calculate_player_rarity()` function
2. Triggered whenever player XP is updated
3. On demand via admin recalculation functions

The frontend never calculates rarity directly but always uses the pre-calculated values from the database.
