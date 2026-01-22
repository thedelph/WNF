# WhatsApp Summary Selection Rules

## Overview

The WhatsApp summary selects the 6 most interesting insights from a game for sharing. Selection logic is implemented in TypeScript (`src/utils/whatsappSummary.ts`) for maintainability.

**Document Date:** January 2026

---

## Selection Algorithm

### Phase 1: Best Insight Per Category (with Player Deduplication)

1. Filter out excluded (negative) insight types
2. Map each insight to its granular category
3. Extract magnitude (sample size) from each insight
4. Calculate impressiveness score (z-score) based on sample size vs population stats
5. Group all candidates by category, sorted by quality
6. Process categories in priority order (best priority first):
   - Try to find insight with **NO player overlap** with already selected
   - If none, find insight with **at least one new player**
   - Fallback: use best candidate even if players repeat
7. Continue until 6 categories selected or no more categories

### Phase 2: Fill Remaining Slots (Category Variety)

If fewer than 6 insights selected:
1. Consider remaining insights not yet selected
2. Filter to categories not yet represented
3. Prefer insights that mention **new players** (player deduplication)
4. Sort by: new player count DESC, priority, impressiveness, created_at
5. Fill remaining slots up to 6

### Strict Category Limit (No Phase 3)

**Important:** We intentionally do NOT allow category repeats. If there aren't 6 unique categories available, we show fewer insights (e.g., 4-5) rather than repeating categories.

**Rationale:** Showing 3 "rivalry_close" insights (e.g., "What a rivalry! X vs Y...") is less valuable than showing 4 diverse insights. Quality and variety over quantity.

---

## Selection Criteria

### 1. Impressiveness Score (Z-Score)

For insights with sample sizes (rivalries, chemistry, trios, partnerships):

```
z-score = (sample_size - mean) / stddev
```

Where mean/stddev come from confidence thresholds (33rd/67th percentiles).

**Interpretation:**
- z-score > 1: Significantly above average (impressive)
- z-score 0-1: Above average
- z-score < 0: Below average

Insights with higher z-scores are prioritized within their category.

### 2. Category Uniqueness

Max **1 insight per granular category** in initial selection.

**Granular Categories:**
| Category | Insight Types |
|----------|---------------|
| `debut` | debut_appearance |
| `return` | return_after_absence, first_game_back_win |
| `trophy` | trophy_change, trophy_new, trophy_extended, trophy_defended |
| `rivalry_first_win` | rivalry_first_win, first_ever_win_nemesis |
| `rivalry_other` | rivalry_perfect, rivalry_dominant, rivalry_close, rivalry_revenge |
| `partnership_milestone` | partnership_milestone |
| `partnership_first` | partnership_first |
| `chemistry_duo` | chemistry_kings |
| `chemistry_milestone` | chemistry_milestone |
| `trio` | trio_dream_team |
| `cap` | cap_milestone |
| `attendance` | attendance_streak |
| `streak` | win_streak, unbeaten_streak, losing_streak_ended, winless_streak_ended |
| `record` | game_record, team_best_score, blowout_game, shutout_game |
| `award` | award_defending_champion, award_* |
| `injury_return` | injury_token_return |
| `bench_warmer` | bench_warmer_promoted |
| `other` | everything else |

### 3. Player Uniqueness

Show each player only once if possible:
- Track mentioned player IDs across selected insights
- When selecting from a category, try alternatives to avoid player overlap:
  1. **First choice**: Insight with NO overlapping players (completely unique)
  2. **Second choice**: Insight with at least one NEW player
  3. **Fallback**: Use the highest-priority insight even if it repeats players
- Only track players for insights with <= 5 player IDs (skip team-wide)

**Example:** If "Dave vs Chris" rivalry is already selected and Chris appears in the best partnership insight, we try to find an alternative partnership insight that doesn't include Chris or Dave.

### 4. Excluded Types

Never include these negative insight types:
- `chemistry_curse`
- `trio_cursed`
- `losing_streak`
- `winless_streak`
- `rivalry_nemesis`
- `player_color_curse`
- `injury_token_used`
- `never_beaten_rivalry`
- `rivalry_ongoing_drought`
- `trophy_retained`

### 5. Priority Tiebreaker

When impressiveness is equal, use priority (1=highest, 5=lowest):
| Priority | Meaning | Examples |
|----------|---------|----------|
| 1 | Critical | Debuts, 50+ attendance streaks |
| 2 | Major | Trophy changes, rivalry first wins, 30+ streaks |
| 3 | Notable | Chemistry kings, partnership milestones |
| 4 | Supporting | 10-19 game streaks, returns |
| 5 | Contextual | 5-9 game streaks, minor milestones |

---

## Magnitude Extraction

Magnitude is extracted from `details` JSON based on insight type:

| Insight Type Pattern | Magnitude Field |
|---------------------|-----------------|
| `attendance_streak` | `details.streak` |
| `win_streak`, `unbeaten_streak` | `details.streak` |
| `losing_streak_ended`, `winless_streak_ended` | `details.ended_streak` |
| `cap_milestone` | `details.caps` |
| `rivalry_first_win`, `first_ever_win_nemesis` | `details.previous_losses` |
| `return_after_absence`, `first_game_back_win` | `details.games_missed` |
| `injury_token_return` | `details.return_streak` |
| `trio_*` | **Bayesian score** (wins, games, k=trio threshold) |
| `chemistry_kings`, `chemistry_duo` | **Bayesian score** (wins, games, k=chemistry threshold) |
| `chemistry_milestone` | **Bayesian score** or raw wins |
| `partnership_milestone` | **Bayesian score** or raw games_together |
| `rivalry_*` with record | **Bayesian score** (W + 0.5×D as wins, k=rivalry threshold) |

**Bayesian Confidence Score (Trios, Chemistry, Rivalries, Partnerships):**

All win/loss-based insights use a Bayesian-adjusted score that balances win rate AND sample size:

```
score = (wins + k×0.5) / (games + k)
```

Where **k is dynamic and proportional** to the typical sample size for each category:
- **k** = 33rd percentile of games together (from `get_confidence_thresholds` RPC)
- As more games are played, k scales automatically with the data

| Category | Typical k | Why |
|----------|-----------|-----|
| Trio | ~6 | Trios have fewer games together |
| Chemistry | ~14 | Duos play together more often |
| Partnership | ~15 | Similar to chemistry |
| Rivalry | ~17 | Cross-team matchups accumulate over time |

**Example with k=6 (trio):**

| Trio | Games | Win Rate | Wins | Bayesian Score |
|------|-------|----------|------|----------------|
| A | 7 | 100% | 7 | (7+3)/(7+6) = **77%** |
| B | 8 | 75% | 6 | (6+3)/(8+6) = **64%** |
| C | 2 | 100% | 2 | (2+3)/(2+6) = **63%** |

Result: A > B > C (7@100% beats 8@75%, but 2@100% doesn't)

**For rivalries**, draws count as half a win: `effectiveWins = wins + draws×0.5`

---

## WhatsApp Message Format

```
🏟️ *WNF #123*: 🔵 Blue 5-3 Orange 🟠

📊 *Post-Match Analysis*

1. 🎉 Player makes their WNF debut!
2. 🔥 Player wins 5 in a row
3. 🎯 Player beats nemesis for first time
4. 👯 A & B reach 50 games together
5. 🔗 C & D have 80% win rate together
6. 🛡️ Player unbeaten in 8 games
```

---

## TypeScript Implementation

**File:** `src/utils/whatsappSummary.ts`

### Key Functions

```typescript
// Main selection function
selectWhatsAppInsights(
  insights: PostMatchInsight[],
  thresholds: ConfidenceThreshold[],
  config?: Partial<SelectionConfig>
): PostMatchInsight[]

// Format selected insights into WhatsApp message
formatWhatsAppSummary(
  game: GameSummary,
  selectedInsights: PostMatchInsight[]
): string

// Calculate impressiveness z-score
calculateImpressiveness(
  insight: PostMatchInsight,
  thresholds: ConfidenceThreshold[]
): number

// Extract sample size magnitude from insight
getMagnitude(insight: PostMatchInsight): number

// Map insight type to granular category
getCategory(analysisType: string): string
```

### Configuration

```typescript
const DEFAULT_CONFIG: SelectionConfig = {
  maxInsights: 6,
  maxPerCategory: 1,
  excludedTypes: [
    'chemistry_curse', 'trio_cursed', 'losing_streak',
    'winless_streak', 'rivalry_nemesis', 'player_color_curse',
    'injury_token_used', 'never_beaten_rivalry',
    'rivalry_ongoing_drought', 'trophy_retained'
  ],
  maxPlayersPerInsight: 5
};
```

---

## Testing

### Unit Tests

Test cases for `selectWhatsAppInsights()`:
1. Selects max 1 per category
2. Excludes negative types
3. Prefers higher z-score within category
4. Deduplicates players across insights
5. Respects max 6 limit
6. Falls back gracefully with < 6 candidates

### Manual Verification

Compare output with SQL function for recent games:
1. Generate summary for completed game
2. Verify category variety (no duplicates in types)
3. Verify player spread (different players featured)
4. Verify impressive stats shown (higher magnitudes)

---

## Migration Notes

### From SQL to TypeScript

The SQL function `get_whatsapp_summary` is preserved but the TypeScript version is now primary:

**Advantages of TypeScript:**
- Version controlled with code
- Easy to test with unit tests
- Simpler to modify and debug
- Consistent with rest of frontend

**Trade-offs:**
- Fetches all insights (vs just 6 from SQL)
- Client-side processing (minimal impact)

### Rollback

If issues arise, can revert to SQL-based selection by calling the RPC directly instead of the TypeScript utility.
