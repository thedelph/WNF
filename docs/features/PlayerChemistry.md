# Player Chemistry Feature

**Added:** December 2025 (v1.3.2)

## Overview

The Player Chemistry feature shows how well player pairs perform when playing together on the same team. It uses a sample-size-weighted scoring system to ensure statistical reliability, preventing pairs with few games from dominating the leaderboard.

## Formula

### Points System
- Win = 3 points
- Draw = 1 point
- Loss = 0 points

### Performance Rate
```
performance_rate = (wins × 3 + draws × 1) / (games × 3) × 100
```
This represents points earned as a percentage of maximum possible points:
- 100% = all wins
- 33.3% = all draws
- 0% = all losses

### Chemistry Score
```
chemistry_score = performance_rate × confidence_factor
```
Where:
```
confidence_factor = games_together / (games_together + K)
```
**K = 10** (balanced weighting)

### Example Calculations

| Games | Record (W/D/L) | Perf Rate | Confidence | Score |
|-------|----------------|-----------|------------|-------|
| 10    | 7/1/2          | 73.3%     | 0.50       | 36.7  |
| 20    | 12/4/4         | 66.7%     | 0.67       | 44.4  |
| 50    | 25/10/15       | 56.7%     | 0.83       | 47.1  |

**Minimum threshold:** 10 games together

## Display Locations

### 1. Stats Page - Best Chemistry Leaderboard
Located in the **Performance** tab, shows top player pairs ranked by chemistry score.

Displays:
- Player pair names
- Chemistry score (prominent)
- W/D/L record (desktop only)
- Games count
- Performance percentage

### 2. Player Profile - Top Chemistry Partners
Shows the top 3 players that the viewed player performs best with.

Displays:
- Partner name (linked to their profile)
- W/D/L record with games count
- Performance % and chemistry score
- Column headers for clarity

### 3. Player Profile - Your Chemistry With [Player]
When logged in and viewing another player's profile, shows your personal chemistry stats with them.

Features:
- Record together (W/D/L)
- Games played together
- Performance rate
- Chemistry score
- Humorous tier-based message

## Tier Messages

Performance-based messages with football humour (random selection per tier):

| Tier | % Range | Example Messages |
|------|---------|------------------|
| Legendary | 80%+ | "Xavi & Iniesta vibes!", "Best partnership in WNF history" |
| Elite | 70-80% | "Rio & Vidic energy", "Like Salah & TAA" |
| Excellent | 60-70% | "Like a fine wine, this partnership just works" |
| Good | 50-60% | "Like Carrick & Fletcher - underrated but effective" |
| Average | 40-50% | "Even Gerrard & Lampard needed time" |
| Below Avg | 30-40% | "Drawing specialists!", "Mourinho would be proud" |
| Poor | 20-30% | "Giving Mustafi & Luiz a run for their money" |
| Terrible | <20% | "The opposition sends thank you cards" |

## Database

### RPC Functions

**`get_player_chemistry(target_player_id, target_year)`**
Returns all player pair chemistry stats, optionally filtered by player and/or year.

**`get_player_pair_chemistry(player_one_id, player_two_id)`**
Returns chemistry stats between two specific players.

**`get_player_top_chemistry_partners(target_player_id, limit_count, target_year)`**
Returns top N chemistry partners for a given player.

## Files

### Created
- `supabase/migrations/20251218_add_player_chemistry.sql` - Database functions
- `src/types/chemistry.ts` - TypeScript types
- `src/hooks/usePlayerChemistry.ts` - React hook for fetching chemistry data
- `src/components/profile/PlayerChemistry.tsx` - UI components

### Modified
- `src/hooks/useStats.ts` - Added chemistry stats to Stats interface
- `src/components/stats/PerformanceStats.tsx` - Added Best Chemistry card
- `src/pages/PlayerProfile.tsx` - Added chemistry sections

## Related Documentation
- [Player Stats Overview](../PlayerStatsFeaturesOverview.md)
- [Win Rate Explainer](../WinRateExplainer.md)
- [Performance Stats Component](../components/PerformanceStats.md)
