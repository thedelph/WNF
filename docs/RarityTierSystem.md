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
| **Academy** | 0 XP, 0 Caps | New players who haven't played their first game yet |
| **Retired** | 0 XP, >0 Caps | Inactive players who have played before but now have 0 XP |

## Implementation Details

### Database Calculation

Rarity tiers are calculated in the database using the `calculate_player_rarity()` function. The function:

1. First identifies players with 0 XP and 0 caps and assigns them to the "Academy" tier
2. Then identifies players with 0 XP but >0 caps and assigns them to the "Retired" tier
3. Calculates percentile ranks only among players with XP > 0
4. Assigns appropriate tiers based on percentile thresholds

```sql
-- Simplified version of the database calculation
BEGIN
  -- Handle players with 0 XP AND 0 caps - they get the 'Academy' tier
  UPDATE player_xp
  SET rarity = 'Academy'
  FROM players p
  WHERE player_xp.player_id = p.id
  AND player_xp.xp = 0
  AND p.caps = 0;

  -- Handle players with 0 XP but caps > 0 - they get the 'Retired' tier
  UPDATE player_xp
  SET rarity = 'Retired'
  FROM players p
  WHERE player_xp.player_id = p.id
  AND player_xp.xp = 0
  AND p.caps > 0;

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
- **Academy**: Deep teal gradient card with pulse animation
- **Retired**: Black card design with light text (no rank shield displayed)

## Rationale for "Academy" and "Retired" Tiers

### Academy Tier
The "Academy" tier was introduced to distinguish new players who haven't played their first game yet from those who have played before but are now inactive. This provides:

1. A welcoming designation for new players joining the system
2. Clear differentiation between "new" and "inactive" players
3. A positive, aspirational label that suggests potential and growth
4. Visual distinction with a bright, hopeful color scheme

### Retired Tier
As XP tapers off after 40 games, many inactive players eventually reach 0 XP. The "Retired" tier is for players who:

1. Have played at least one game (caps > 0)
2. Currently have 0 XP due to inactivity
3. Are distinguished from new players who simply haven't played yet

This dual-tier approach for 0 XP players:
- Keeps the percentile calculations meaningful by only including active players
- Provides clear visual separation between new, active, and inactive players
- Eliminates confusion about player status
- Ensures the tier system remains relevant and meaningful for all player types

### UI Implementation Details

- Academy player cards use a deep teal gradient with a subtle pulse animation to suggest fresh potential while ensuring excellent contrast for white text
- Retired player cards use a black background with light text for high visibility and clear distinction
- Rank shields are not displayed on Academy or Retired player cards (only active players with XP > 0 show rank shields)
- This implementation maintains UI consistency by avoiding the display of "0" rank for players with no XP

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
