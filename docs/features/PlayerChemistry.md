# Player Chemistry Feature

**Added:** December 2025 (v1.3.2)
**Enhanced:** January 2026 (v13.0) - Added Rivalry and Trio Chemistry

## Overview

The Player Chemistry system tracks player relationships across multiple dimensions:

1. **Pairwise Chemistry** - How well two players perform TOGETHER on the same team
2. **Rivalry** - How players perform AGAINST each other on opposite teams *(New in v13.0)*
3. **Trio Chemistry** - Emergent synergies when 3 specific players play together *(New in v13.0)*

All metrics use a sample-size-weighted scoring system to ensure statistical reliability.

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

---

## Rivalry (Cross-Team Matchups)

**Added:** January 2026 (v13.0)

Rivalry tracks how players perform when playing AGAINST each other on opposite teams. This captures competitive dynamics that pairwise chemistry cannot.

### Rivalry Score

```
rivalry_score = player1_wins / (player1_wins + player2_wins) × 100
```

- **50** = Neutral (even head-to-head record)
- **>50** = Player 1 dominates
- **<50** = Player 2 dominates

### Example Rivalries

| Player 1 | vs | Player 2 | Games | Record | Rivalry Score |
|----------|-----|----------|-------|--------|---------------|
| Stephen | vs | Dom | 16 | 13-2-1 | 86.7 (Stephen dominates) |
| Tom K | vs | Joe | 11 | 8-1-2 | 88.9 (Tom K dominates) |
| Chris H | vs | Nathan | 14 | 10-2-2 | 83.3 (Chris H dominates) |

**Minimum threshold:** 5 games against each other

### Why This Matters

If Stephen consistently beats Dom when they're on opposite teams, putting them against each other creates an inherent advantage for Stephen's team. The algorithm tries to balance these matchup advantages.

---

## Trio Chemistry

**Added:** January 2026 (v13.0)

Trio chemistry captures emergent effects when 3 specific players play together. Some combinations have synergies (or anti-synergies) that pairwise chemistry alone cannot capture.

### Trio Score

Uses the same formula as pairwise chemistry:
```
trio_score = performance_rate × confidence_factor
```
Where `confidence_factor = games / (games + 10)`

### Example Trios

**Dream Trios (100% win rate):**
| Players | Games | Record | Trio Score |
|---------|-------|--------|------------|
| Daniel + Simon + Jude | 6 | 6-0-0 | 37.5 |
| Stephen + Chris H + Tom K | 6 | 6-0-0 | 37.5 |

**Cursed Trios (0% win rate):**
| Players | Games | Record | Trio Score |
|---------|-------|--------|------------|
| James H + Mike M + Chris H | 6 | 0-6-0 | 0.0 |
| Dave + Joe + Dom | 6 | 0-6-0 | 0.0 |

**Minimum threshold:** 3 games together as a trio

### Why This Matters

Pairwise chemistry might show A+B, B+C, and A+C all have mediocre scores, but when A+B+C play together they consistently win (or lose). Trio chemistry captures these emergent effects.

---

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

### 4. Hall of Fame Tab - All Time Awards
Shows chemistry, rivalry, and trio awards in the Hall of Fame tab (Awards page, "All Time" filter).

**Award Categories:**
| Award | Type | Color | Description |
|-------|------|-------|-------------|
| Dynamic Duo | Pair | pink | Best chemistry pairs |
| Cursed Duos | Pair | rose | Worst chemistry pairs |
| Fiercest Rivalry | Pair | red | Most lopsided head-to-head |
| Dream Team Trio | Trio | purple | Best trio chemistry |
| Cursed Trio | Trio | slate | Worst trio chemistry |

**Display Format:**
- Player names (with profile links)
- Score with label (e.g., "45.2 chemistry", "32.1 curse", "28.5 rivalry")
- W/D/L breakdown, games count, and win percentage

**Mobile Responsiveness (January 2026):**
- Names wrap/stack vertically instead of truncating with "..."
- Score and details left-aligned below names on mobile
- Right-aligned on desktop for horizontal layout

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

## Chemistry in Team Balancing

**Added:** December 2025 (v11.0)
**Enhanced:** January 2026 (v13.0) - Added Rivalry and Trio sub-components

The Brute-Force Optimal algorithm uses chemistry data (20% of total score) to create more balanced teams.

### Chemistry Sub-Components

The 20% chemistry weight is split internally into three sub-components:

| Sub-Component | Internal Weight | Total Weight | Purpose |
|---------------|-----------------|--------------|---------|
| **Pairwise** | 50% | 10% | Balance same-team synergies |
| **Rivalry** | 30% | 6% | Balance cross-team matchup advantages |
| **Trio** | 20% | 4% | Balance emergent 3-player effects |

### How It Works

1. **Data Loading**: All pairwise chemistry, rivalry pairs, and trio data are fetched in parallel
2. **Pairwise Score**: Calculates average chemistry within each team, then difference between teams
3. **Rivalry Score**: Calculates net advantage from cross-team matchups
4. **Trio Score**: Calculates average trio synergy within each team, then difference
5. **Combined Score**: Weighted combination of all three sub-components

### Example Output

```
Chemistry (20%): 0.0160
  └─ Pairwise (50%): 0.0045    // Teams have similar internal chemistry
  └─ Rivalry (30%): 0.0425     // Some cross-team matchup imbalance
  └─ Trio (20%): 0.0048        // Teams have similar trio synergies
```

### Configuration

| Setting | Value |
|---------|-------|
| Pairwise minimum games | 10 |
| Rivalry minimum games | 5 |
| Trio minimum games | 3 |
| Default score (unknown) | 50 (neutral) |
| Total chemistry weight | 20% |

### Graceful Degradation

- Pairs/rivalries/trios with no history: Use neutral score (50)
- If any data source fails to load: Algorithm proceeds without that component
- Algorithm remains functional even if all chemistry features fail

**See also:** [Team Balancing](TeamBalancing.md), [Brute-Force Algorithm](../algorithms/BruteForceOptimalAlgorithm.md)

---

## Database

### RPC Functions

**Pairwise Chemistry:**

**`get_player_chemistry(target_player_id, target_year)`**
Returns all player pair chemistry stats, optionally filtered by player and/or year.

**`get_player_pair_chemistry(player_one_id, player_two_id)`**
Returns chemistry stats between two specific players.

**`get_player_top_chemistry_partners(target_player_id, limit_count, target_year)`**
Returns top N chemistry partners for a given player.

**`get_batch_player_chemistry(player_ids)`** *(Added Dec 2025)*
Returns chemistry stats for all pairs within a given player list. Optimized for team balancing.

**Rivalry:** *(Added Jan 2026)*

**`get_batch_player_rivalry(player_ids)`**
Returns rivalry stats for all pairs within a given player list when they played on opposite teams. Returns games_against, player1_wins, player2_wins, draws, and rivalry_score (0-100).

**Trio Chemistry:** *(Added Jan 2026)*

**`get_batch_trio_chemistry(player_ids)`**
Returns chemistry stats for all trios within a given player list. Returns games_together, wins, losses, draws, win_rate, and trio_score (confidence-weighted).

## Files

### Created

**December 2025 (Original):**
- `supabase/migrations/20251218_add_player_chemistry.sql` - Database functions
- `supabase/migrations/20251218_add_batch_player_chemistry.sql` - Batch RPC for team balancing
- `src/types/chemistry.ts` - TypeScript types (includes ChemistryLookup for team balancing)
- `src/hooks/usePlayerChemistry.ts` - React hook for fetching chemistry data
- `src/hooks/useTeamBalancingChemistry.ts` - Hook for batch chemistry fetching in team balancing
- `src/components/profile/PlayerChemistry.tsx` - UI components

**January 2026 (Rivalry & Trio):**
- `supabase/migrations/20260105_add_rivalry_trio_chemistry.sql` - Rivalry and trio RPC functions
- `src/components/admin/team-balancing/bruteForceOptimal/dataLoaders/loadRivalry.ts` - Rivalry data loader
- `src/components/admin/team-balancing/bruteForceOptimal/dataLoaders/loadTrioChemistry.ts` - Trio data loader
- `src/components/admin/team-balancing/bruteForceOptimal/scoring/rivalryScore.ts` - Rivalry scoring function
- `src/components/admin/team-balancing/bruteForceOptimal/scoring/trioScore.ts` - Trio scoring function

### Modified

**December 2025:**
- `src/hooks/useStats.ts` - Added chemistry stats to Stats interface
- `src/components/stats/PerformanceStats.tsx` - Added Best Chemistry card
- `src/pages/PlayerProfile.tsx` - Added chemistry sections
- `src/components/admin/team-balancing/tierBasedSnakeDraft.ts` - Added chemistry objective
- `src/components/admin/team-balancing/TierBasedTeamGenerator.tsx` - Chemistry fetching integration

**January 2026 (Team Balancing):**
- `src/components/admin/team-balancing/bruteForceOptimal/types.ts` - Added RivalryPair, TrioChemistry, RivalryMap, TrioMap types
- `src/components/admin/team-balancing/bruteForceOptimal/dataLoaders/index.ts` - Added rivalry and trio exports
- `src/components/admin/team-balancing/bruteForceOptimal/scoring/index.ts` - Integrated combined chemistry scoring
- `src/components/admin/team-balancing/bruteForceOptimal/index.ts` - Updated to load and use new data
- `src/components/admin/team-balancing/TierBasedTeamGenerator.tsx` - Updated debug output display

**January 2026 (Hall of Fame & Stats UI):**
- `src/components/awards/AwardPodium.tsx` - Multi-player responsive layout, extended stats display
- `src/components/stats/AwardCard.tsx` - Added `isMultiPlayer` prop for responsive layouts
- `src/components/leaderboards/LiveStatsTab.tsx` - Added Cursed Trio, color scheme, naming consistency
- `src/hooks/useLiveAwards.ts` - Added Cursed Trio fetching, XP achievement date
- `src/constants/awards.ts` - Semantic color scheme, Cursed Trio category
- `src/types/awards.ts` - Added `cursed_trio` to AwardCategory, `achievedDate` to LiveAward

## Related Documentation
- [Player Stats Overview](../PlayerStatsFeaturesOverview.md)
- [Win Rate Explainer](../WinRateExplainer.md)
- [Performance Stats Component](../components/PerformanceStats.md)
- [Team Balancing](TeamBalancing.md)
- [Team Balancing Algorithm Evolution](../algorithms/TeamBalancingEvolution.md)
