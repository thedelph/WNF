# XP System v2

> **Status**: Available for comparison at `/admin/xp-comparison`
> **Production Date**: Planned for January 2026

## Overview

XP System v2 is a revised experience point calculation system designed to address concerns about harsh streak penalties in the original system. The key changes are:

1. **Diminishing streak returns** - Streak bonuses decrease as streaks get longer
2. **Linear base XP decay** - Smoother XP reduction over time instead of step function
3. **Longevity reward** - Games 40+ still worth 1 XP (not 0)

## Why v2?

The original XP system had a problem: players with very long streaks (20+ games) received such large bonuses that missing even one game could drop them dramatically in rankings. For example, a player at rank #1 could fall to rank #16 by missing a single game - losing over 1,000 XP.

**v2 addresses this by:**
- Capping the maximum streak bonus benefit
- Making XP decay more gradual
- Maintaining rewards for consistency while reducing the penalty for occasional absence

---

## Key Changes

### 1. Diminishing Streak Bonus

The attendance streak bonus now uses diminishing returns instead of linear growth.

| Streak Length | v1 (Current) | v2 (New) | Change |
|---------------|--------------|----------|--------|
| 1 game | +10% | +10% | Same |
| 5 games | +50% | +40% | -20% |
| 10 games | +100% | +55% | -45% |
| 15 games | +150% | +60% | -60% |
| 20 games | +200% | +65% | -68% |
| 27 games | +270% | +72% | -73% |

**How it works:**
- Games 1-10: Bonus decreases each game (10%, 9%, 8%, 7%, 6%, 5%, 4%, 3%, 2%, 1%)
- Games 11+: Fixed +1% per additional game

**Formula:**
```
If streak <= 10:
  bonus = (streak * 11 - streak * (streak + 1) / 2) %

If streak > 10:
  bonus = 55% + (streak - 10) %
```

### 2. Linear Base XP Decay

Base XP per game now decays linearly instead of in steps.

| Games Ago | v1 (Current) | v2 (New) |
|-----------|--------------|----------|
| 0 (most recent) | 20 XP | 20 XP |
| 5 | 18 XP | 17.5 XP |
| 10 | 14 XP | 15 XP |
| 20 | 12 XP | 10 XP |
| 30 | 5 XP | 5 XP |
| 38 | 5 XP | 1 XP |
| 40+ | 0 XP | 1 XP |

**Key difference:** Games 40+ still contribute 1 XP each, rewarding long-term players.

**Formula:**
```
xp_per_game = MAX(1, 20 - (games_ago * 0.5))
```

### 3. Unchanged Components

These modifiers remain the same in v2:

| Modifier | Calculation | Notes |
|----------|-------------|-------|
| Reserve XP | +5 XP per reserve game | Within 40-game window |
| Bench warmer streak | +5% per consecutive reserve | Rarely exceeds 3 games |
| Registration streak | +2.5% per registration | Only when reserve |
| Unpaid games | -50% per unpaid game | Strong penalty unchanged |
| Shield tokens | Freeze streak on miss | Works the same |

---

## Real Player Examples

### Example 1: High-Streak Player (27-game streak)

**Paul with 27-game streak:**
| Metric | v1 | v2 |
|--------|-----|-----|
| Streak Bonus | +270% | +72% |
| Total XP | 1,547 | 743 |
| Rank | #1 | #1 |

**If Paul misses next game:**
| Metric | v1 | v2 |
|--------|-----|-----|
| XP Lost | 1,129 (73%) | 311 (42%) |
| New Rank | #16 | #16 |

### Example 2: Medium-Streak Player (10-game streak)

**Player with 10-game streak:**
| Metric | v1 | v2 |
|--------|-----|-----|
| Streak Bonus | +100% | +55% |

**If they miss next game:**
- v1: Loses entire 100% bonus = massive XP drop
- v2: Loses 55% bonus = significant but less punishing

### Example 3: New Regular (5-game streak)

**Player with 5-game streak:**
| Metric | v1 | v2 |
|--------|-----|-----|
| Streak Bonus | +50% | +40% |

For newer regulars, the difference is minimal - both systems reward consistent attendance similarly.

---

## Complete Formula Reference

### Base XP Calculation

```sql
-- Per-game XP value based on recency
xp_per_game = GREATEST(1.0, 20.0 - (games_ago * 0.5))
```

### Streak Bonus Calculation

```sql
streak_bonus = CASE
    WHEN streak <= 0 THEN 0
    WHEN streak <= 10 THEN
        (streak * 11 - (streak * (streak + 1)) / 2) / 100.0
    ELSE
        (55 + (streak - 10)) / 100.0
END
```

### Total XP Formula

```sql
total_xp = ROUND(
    (base_game_xp + reserve_xp) *
    (1 + streak_bonus + bench_warmer_bonus + registration_bonus + unpaid_penalty)
)
```

Where:
- `base_game_xp` = Sum of all game XP values (using linear decay)
- `reserve_xp` = 5 * number of reserve games (within 40 games)
- `streak_bonus` = Diminishing returns formula
- `bench_warmer_bonus` = 5% per consecutive reserve appearance
- `registration_bonus` = 2.5% per consecutive registration (when reserve)
- `unpaid_penalty` = -50% per unpaid game

---

## FAQ

**Q: Why change the system?**
A: Players with very long streaks were getting such huge bonuses that missing one game would devastate their ranking. This made attendance feel mandatory rather than rewarding.

**Q: Will my rank change?**
A: Possibly. Players with very long streaks will see their XP compressed. Check `/admin/xp-comparison` to preview.

**Q: Do my games still count?**
A: Yes! All historical games still count. Only the calculation formula changes.

**Q: What about shield tokens?**
A: Shield tokens work exactly the same - they still protect your streak from resetting.

**Q: When does this go live?**
A: January 2026. The comparison tool is available now for preview.

**Q: Can I see both values now?**
A: Yes! Visit `/admin/xp-comparison` (admin only) to see current vs v2 XP side-by-side.

---

## Database Objects

### Tables
- `player_xp_v2` - Stores v2 XP values, ranks, and rarity tiers

### Functions
- `calculate_player_xp_v2(player_id)` - Calculate XP for one player
- `recalculate_all_player_xp_v2()` - Batch recalculate all players

### Views
- `player_xp_comparison` - Side-by-side v1 vs v2 comparison

### Triggers
- `trigger_xp_v2_on_game_complete` - Auto-recalculate when games complete

---

## Related Documentation

- [XP System v1 (Current)](../XPSystemExplained.md) - Original system documentation
- [XP Breakdown Component](../components/XPBreakdown.md) - UI component for XP display
- [Migration Guide](../migrations/XPv1ToV2Migration.md) - Technical migration runbook
- [Shield Token System](../ShieldTokenSystem.md) - Streak protection mechanics
