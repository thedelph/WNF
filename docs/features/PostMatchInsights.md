# Post-Match Insights System

**Last Updated:** January 17, 2026
**Version:** 2.4.0

## Overview

The Post-Match Insights System automatically generates narrative highlights for completed WNF games. Insights cover individual streaks, duo/trio chemistry, rivalries, milestones, attendance patterns, game records, year-over-year award tracking, and injury token statistics. They are displayed in the Game Detail page and included in WhatsApp summaries.

**Key Features:**
- On-demand generation when viewing game details
- 49+ insight types across 8 filter categories (including 2 injury insights)
- Priority-based display ordering (priority 1 insights always shown)
- Player involvement tracking for personalized filtering
- WhatsApp summaries with up to 8 insights for variety
- Year-over-year award comparisons
- Goal scoring pattern analysis
- Enhanced team color tracking with dominance/streaks
- **Confidence-weighted priority** for percentage-based stats (higher sample size = better priority)
- **Modular architecture** for maintainability (9 helper functions)

## Insight Categories

### Trophy Changes

Trophy insights track movement in Hall of Fame award standings.

| Type | Trigger | Example |
|------|---------|---------|
| `trophy_change` | Medal position change | "Phil R takes gold for Appearance King" |
| `trophy_new` | New medal earned | "Simon enters Hall of Fame: Win Rate Leader bronze" |
| `trophy_extended` | Medal held again | "Chris holds Win Rate Leader gold for 3rd straight game" |

### Year-over-Year Awards (Added Jan 2026)

Tracks award standings compared to previous year.

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `award_defending_champion` | Player won this award category last year | 3 | "Defending champion: Chris won Iron Man gold in 2025" |

**Note:** The system compares current year medal positions with the same award category from the previous calendar year.

### Individual Streaks

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `win_streak` | 3+ consecutive wins | 2 | "On fire! Simon wins 4 in a row" |
| `win_streak_ended` | 3+ win streak broken | 3 | "Streak ended: Maddocks' 3-game win streak broken" |
| `losing_streak` | 4+ consecutive losses | 4 | "Struggling: James H hasn't won in 4 games" |
| `losing_streak_ended` | Win after 3+ losses | 2 | "Finally! Dom ends 5-game losing run" |
| `unbeaten_streak` | 5+ games without loss | 3 | "Unbeaten in 6! Simon extends run" |
| `winless_streak_ended` | Win after 5+ winless | 2 | "Off the mark! Phil R wins after 6 winless" |

### Attendance Streaks (Added Jan 2026)

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `attendance_streak` | 10/20/30/40/50 consecutive games | 2-4 | "Iron man! Paul reaches 30 consecutive games" |
| `attendance_streak_ended` | Streak ended after 10+ games | 4 | "Streak broken: Chris misses game after 29 straight" |

**Priority by milestone:**
- 40/50 games: Priority 2
- 30 games: Priority 3
- 10/20 games: Priority 4

### Injury Token Statistics (Implemented Jan 2026)

Tracks injury token usage for streak protection. These insights show when players are sidelined due to injury and when they return to action.

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `injury_token_used` | Player has active injury for this game (injury_game_id matches) | 1-2 | "🏥 Sidelined: Jack G out with injury (protecting 23-game streak)" |
| `injury_token_return` | Player returns from injury this game (return_game_id matches) | 2-3 | "💉 Back in action! Jarman returns from injury (streak: 13)" |

**Priority Logic:**
- `injury_token_used`: Priority 1 if activated within 48 hours of game, otherwise Priority 2
- `injury_token_return`: Priority 2 if return_streak >= 20 games, otherwise Priority 3

**Database Query - Injury Absence:**
```sql
SELECT itu.*, p.friendly_name
FROM injury_token_usage itu
JOIN players p ON p.id = itu.player_id
WHERE itu.injury_game_id = :game_id
  AND itu.status = 'active';
```

**Database Query - Injury Return:**
```sql
SELECT itu.*, p.friendly_name
FROM injury_token_usage itu
JOIN players p ON p.id = itu.player_id
WHERE itu.return_game_id = :game_id
  AND itu.status = 'returned';
```

**WhatsApp Summary:**
- `injury_token_return` is included in WhatsApp summaries (positive/celebratory)
- `injury_token_used` is excluded from WhatsApp (informational, not celebratory)

**Frontend Mappings:**
- Emoji: `injury_token_used` → 🏥, `injury_token_return` → 💉
- Category: Both mapped to 'streaks' filter tab

### Chemistry Insights (Same-Team Pairs)

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `chemistry_kings` | 60%+ win rate together (10+ games) | 3 | "Chemistry kings: Phil R & Simon win again (68%)" |
| `chemistry_curse` | ≤35% win rate together (10+ games) | 4 | "Cursed combo? Dom & James lose again (32%)" |
| `chemistry_milestone` | 10/20/30/40/50 wins together | 3 | "20 wins together! Phil R & Chris" |

### Trio Chemistry Insights

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `trio_dream_team` | 65%+ win rate as trio (5+ games) | 3 | "Dream team: Phil/Simon/Chris win again (70%)" |
| `trio_cursed` | ≤35% win rate as trio (5+ games) | 4 | "Cursed trio: Dom/James/Calvin lose again (30%)" |

### Rivalry Insights (Cross-Team Opponents)

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `rivalry_nemesis` | 10+ win advantage | 2 | "Nemesis! Simon dominates Dom (15-2-8)" |
| `rivalry_dominant` | 5-9 win advantage | 3 | "Dominant: Phil R vs James H (10-1-4)" |
| `rivalry_close` | ≤3 diff, 15+ games | 3 | "Chris closes gap vs Phil (9W-0D-10L)" |
| `rivalry_first_win` | First ever win vs opponent | 3 | "First time! Dave beats Simon" |
| `rivalry_perfect` | Undefeated, 4+ games | 2 | "Perfect record: Tom K vs James (4-0-0)" |
| `rivalry_revenge` | Win after 3+ losses vs opponent | 2 | "Revenge! Dom beats Simon after 4 straight losses" |
| `never_beaten_rivalry` | 0 wins vs opponent (5+ games) | 3 | "Can they ever do it? Joe is 0-2-5 vs Simon" |
| `first_ever_win_nemesis` | First win after 5+ losses | 1 | "HISTORIC! Nathan beats Zhao for FIRST TIME EVER (was 0-3-5)" |
| `rivalry_ongoing_drought` | 5+ consecutive losses vs opponent | 4 | "The drought continues: Joe falls to 0-3-6 vs Simon" |

**rivalry_close Wording (Fixed Jan 2026):**
The wording adapts based on the winner's actual H2H record:
- Winner ahead overall: "extends lead vs"
- Winner behind overall: "closes gap vs"
- Tied overall: "levels the series vs"

### Milestone & Record Insights

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `cap_milestone` | 10/25/50/75/100/150 caps | 4 | "Century club! Chris played their 100th game" |
| `partnership_first` | First time together | 5 | "First time! Dave and New Player team up" |
| `partnership_milestone` | 10/25/50/75/100 games together | 4 | "50 games together: Phil R & Simon" |
| `game_record` | 15+ goals or 1-goal margin | 5 | "Goal fest! 17 goals scored" |
| `team_streak` | Blue/Orange 5+ consecutive wins | 4 | "Blue team wins 6 in a row!" |

### Game-Level Insights (Added Jan 2026)

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `blowout_game` | 5+ goal margin | 3 | "Dominant display! Blue demolishes opposition 11-4" |
| `shutout_game` | One team scores 0 | 3 | "Clean sheet! Blue keeps opposition scoreless (3-0)" |

### Player Appearance Insights (Added Jan 2026)

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `debut_appearance` | Player's first ever WNF game | 3 | "Making their debut: Welcome to WNF, Dave!" |
| `return_after_absence` | Player returns after 5+ missed games | 3-4 | "Welcome back! Jimmy returns after 6-game absence" |
| `first_game_back_win` | Player wins on return after 5+ missed | 2 | "Triumphant return! Joe wins on comeback after 10-game break" |
| `bench_warmer_promoted` | Player selected after 3+ reserve apps | 4 | "Finally off the bench! Jude plays after 4 reserve appearances" |

**Return after absence priority:**
- 20+ games missed: Priority 3
- 5-19 games missed: Priority 4

### Goal Scoring Patterns (Added Jan 2026)

Tracks notable goal scoring patterns across games.

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `low_scoring_game` | Total goals ≤ 6 | 4 | "Defensive battle: Only 5 goals scored in WNF #80" |
| `team_best_score` | Highest score for Blue/Orange this year | 3 | "Orange's best! 12 goals - highest Orange score in 2026" |

**Note:** Best scores are compared within the current calendar year.

### Team Color Insights (Enhanced Jan 2026)

Tracks team color patterns for both teams and individual players.

| Type | Trigger | Priority | Example |
|------|---------|----------|---------|
| `team_color_loyalty` | 70%+ on one team (20+ games) | 5 | "True Orange! Nathan has played Orange 70% of the time" |
| `team_color_switch` | Plays other team after 5+ game streak | 5 | "Rare sight! Paul plays Orange for first time in 7 games" |
| `team_color_dominance` | One team wins 5+ of last 7 games | 3 | "Blue dominance: Won 6 of last 7 games!" |
| `team_color_streak_broken` | Long team winning streak ends | 3 | "Orange ends Blue's 5-game winning streak" |
| `player_color_curse` | 30%+ better win rate on one color (20+ games each) | 4 | "Color curse: Nathan wins 65% on Blue, only 40% on Orange" |

**Player Color Curse Threshold:**
- Requires 20+ games on each team
- Win rate difference must be ≥30 percentage points

## Priority System

Priority determines display order (lower = more important):

| Priority | Meaning | Examples |
|----------|---------|----------|
| 1-2 | Major achievements | Trophy changes, nemesis, revenge |
| 3 | Notable achievements | Win streaks, chemistry kings, close rivalries |
| 4 | Supporting insights | Losing streaks, chemistry curse, milestones |
| 5 | Contextual info | Game records, partnership firsts |

In the UI, insights are sorted by priority ascending. The InsightsSection shows top 12 initially with a "Show more" button.

## Confidence-Weighted Priority (Added Jan 2026)

For percentage-based insights (chemistry, trios, rivalries, color stats), the system adjusts priority based on sample size. Statistics with larger sample sizes are considered more reliable and get better priority.

### Dynamic Thresholds

Thresholds are **calculated dynamically** from actual data distribution using percentiles:
- **Low/Medium boundary:** 33rd percentile of sample sizes
- **Medium/High boundary:** 67th percentile of sample sizes

This means thresholds automatically adapt as more games are played, ensuring confidence ratings remain proportional to the actual data.

### Proportional by Insight Type

Different insight types naturally have different sample size ranges:

| Insight Type | Typical Range | Why |
|--------------|---------------|-----|
| **Trios** | 5-15 games | Three players rarely align together |
| **Chemistry (duos)** | 10-25 games | Two players team up more often |
| **Rivalries** | 15-30 games | Cross-team matchups happen frequently |

The dynamic system accounts for this - a trio with 10 games is "High confidence" while a rivalry with 10 games is "Low confidence".

### Database Function

```sql
-- Returns dynamic thresholds based on actual data
SELECT * FROM get_confidence_thresholds();
-- Returns: insight_category, low_threshold, high_threshold
```

### Affected Insight Types

Confidence weighting applies to:
- **Trio insights:** `trio_dream_team`, `trio_cursed`
- **Chemistry insights:** `chemistry_kings`, `chemistry_curse`
- **Rivalry insights:** All `rivalry_*` types, `never_beaten_rivalry`, `first_ever_win_nemesis`
- **Color insights:** `player_color_curse`, `team_color_dominance`

### Exceptions

Some insight types bypass confidence adjustment because they are inherently notable regardless of sample size:
- `first_ever_win_nemesis` - Historic moment
- `rivalry_first_win` - First win is always notable
- `rivalry_perfect` - Perfect record is inherently impressive

### UI Display

In the InsightsSection, percentage-based insights display a confidence badge showing:
- Sample size (e.g., "7 games")
- Confidence level (High/Med/Low)
- Tooltip explaining relative position (e.g., "top third for trios")

**Example:** A trio with 100% win rate in 5 games shows `5 games • Low` in a red badge, while the same trio stat with 12 games shows `12 games • High` in a green badge (since 12 is in the top third for trios).

### WhatsApp Summary Selection

The WhatsApp summary uses confidence-adjusted priority when selecting insights. This means a 70% win rate with 30 games will rank higher than a 100% win rate with only 5 games, ensuring the summary features statistically significant insights.

## Database Functions

### Modular Architecture (Added Jan 2026)

The insights system uses a modular architecture with **9 helper functions** for maintainability:

```
Main Orchestrator: generate_game_insights_on_demand (~100 lines)
  ├── _generate_appearance_insights()    (~120 lines) - Debuts, returns, bench promotions
  ├── _generate_injury_insights()        (~80 lines)  - Injury absence + returns
  ├── _generate_streak_insights()        (~150 lines) - Attendance, win/loss streaks
  ├── _generate_team_color_insights()    (~100 lines) - Team loyalty, switches
  ├── _generate_game_record_insights()   (~100 lines) - Blowouts, shutouts, close games
  ├── _generate_milestone_insights()     (~150 lines) - Caps, partnerships
  ├── _generate_chemistry_insights()     (~120 lines) - Duo chemistry
  ├── _generate_trio_insights()          (~100 lines) - Trio chemistry
  └── _generate_rivalry_insights()       (~250 lines) - All rivalry types
```

**Benefits:**
- Each helper is 80-250 lines (vs 1,300+ monolithic)
- Adding new insights only touches relevant helper
- Context window issues eliminated for AI assistance
- Same transaction boundary maintained

### generate_game_insights_on_demand

Main orchestrator function. Calls all helper functions to generate insights.

```sql
generate_game_insights_on_demand(p_game_id UUID)
RETURNS TABLE(
  analysis_type TEXT,
  priority INTEGER,
  headline TEXT,
  details JSONB,
  player_ids UUID[]
)
```

**Behavior:**
1. Deletes any existing insights for the game
2. Gets player lists (blue, orange, winners, losers)
3. Calls each helper function in sequence
4. Returns all generated insights from `post_match_analysis` table

### calculate_player_streaks_before_game

Helper function for calculating player streaks at a specific point in time.

```sql
calculate_player_streaks_before_game(
  p_player_id UUID,
  p_game_date TIMESTAMPTZ
)
RETURNS TABLE(
  win_streak INTEGER,
  losing_streak INTEGER,
  unbeaten_streak INTEGER
)
```

### get_post_match_analysis

Retrieves generated insights for display.

```sql
get_post_match_analysis(p_game_id UUID)
RETURNS TABLE(...)
```

### get_whatsapp_summary

Retrieves the WhatsApp-formatted game summary text.

```sql
get_whatsapp_summary(p_game_id UUID)
RETURNS TEXT
```

## React Hook

### usePostMatchAnalysis

**Location:** `src/hooks/usePostMatchAnalysis.ts`

```typescript
const {
  insights,         // PostMatchInsight[]
  whatsappSummary,  // string
  loading,          // boolean
  error,            // string | null
  generating,       // boolean
  generateOnDemand, // () => Promise<void>
} = usePostMatchAnalysis(gameId);
```

### Helper Functions

```typescript
// Group insights by category for display
groupInsightsByType(insights: PostMatchInsight[]): Record<string, PostMatchInsight[]>

// Get emoji for insight type
getInsightEmoji(analysisType: string): string
// Examples:
// 'win_streak' → '🔥'
// 'trophy_change' → '👑'
// 'chemistry_kings' → '🔗'
// 'rivalry_nemesis' → '😈'
// 'cap_milestone' → '🎖️'
// New v2 emojis:
// 'debut_appearance' → '⭐'
// 'return_after_absence' → '👋'
// 'first_game_back_win' → '💪'
// 'attendance_streak' → '🏃'
// 'bench_warmer_promoted' → '📣'
// 'team_color_loyalty' → '💙'
// 'team_color_switch' → '🔄'
// 'blowout_game' → '💥'
// 'shutout_game' → '🧤'
// 'never_beaten_rivalry' → '😰'
// 'first_ever_win_nemesis' → '🎉'
// 'rivalry_ongoing_drought' → '🏜️'
// Phase 3 emojis (Jan 2026):
// 'award_defending_champion' → '🏆'
// 'low_scoring_game' → '🧱'
// 'team_best_score' → '📈'
// 'team_color_dominance' → '💪'
// 'team_color_streak_broken' → '⛔'
// 'player_color_curse' → '🎭'
// 'injury_token_used' → '🏥'
// 'injury_token_return' → '💉'
```

## Data Types

### PostMatchInsight

```typescript
interface PostMatchInsight {
  id: string;
  gameId: string;
  analysisType: string;      // e.g., 'win_streak', 'rivalry_close'
  priority: number;          // 1-5, lower = more important
  headline: string;          // Display text
  details: Record<string, unknown>;  // Structured data
  playerIds: string[];       // Players involved
  createdAt: string;
}
```

### Details Object Structure

The `details` object varies by insight type but commonly includes:

```typescript
// Streak insights
{ player_name: string, player_id: string, streak: number }

// Chemistry insights
{ player1_name: string, player2_name: string, win_rate: number, games: number }

// Rivalry insights
{ winner_name: string, winner_id: string, loser_name: string, loser_id: string, record: string }
```

## UI Display

### InsightsSection Component

**Location:** `src/components/results/InsightsSection.tsx`

**Features:**
- Collapsible section with insight count badge
- 8 category filter tabs (auto-hide when empty)
- Player filter dropdown
- "My Insights" quick filter for logged-in users
- Priority-based card styling (border colors)
- Show more/less functionality (top 12 initially)

### Filter Tabs (Updated Jan 2026)

| Tab | Icon | Insight Types |
|-----|------|---------------|
| All | ✨ Sparkles | All insights |
| Trophies | 🏆 Trophy | `trophy_*`, `award_*` |
| Streaks | 🔥 Flame | `*_streak*` (win, loss, attendance, team), `injury_token_*` |
| Chemistry | 👥 Users | `chemistry_*`, `trio_*`, `partnership_*` |
| Rivalries | ⚔️ Swords | `rivalry_*`, `never_beaten_rivalry`, `first_ever_win_nemesis` |
| Appearances | 👤+ UserPlus | `debut_appearance`, `return_after_absence`, `first_game_back_win`, `bench_warmer_promoted` |
| Game | 🎮 Gamepad2 | `game_record`, `blowout_game`, `shutout_game`, `team_color_*`, `low_scoring_game`, `team_best_score`, `player_color_curse` |
| Milestones | 🎯 Target | `cap_milestone`, `personal_best*` |

**Category Mapping:**
```typescript
const getFilterCategory = (analysisType: string): InsightFilter => {
  // Trophy insights (Hall of Fame changes + year-over-year awards)
  if (analysisType.startsWith('trophy_') || analysisType.startsWith('award_')) return 'trophies';

  // Streak insights (win/loss/unbeaten/attendance streaks + injury token stats)
  if (
    analysisType.includes('streak') ||
    analysisType.includes('team_streak') ||
    analysisType === 'injury_token_used' ||
    analysisType === 'injury_token_return'
  ) return 'streaks';

  // Chemistry insights (partnerships, duos, trios)
  if (analysisType.includes('chemistry') || analysisType.includes('trio') || analysisType.includes('partnership')) return 'chemistry';

  // Rivalry insights (head-to-head matchups)
  if (analysisType.includes('rivalry') || analysisType === 'never_beaten_rivalry' || analysisType === 'first_ever_win_nemesis') return 'rivalries';

  // Appearance insights (debuts, returns, bench promotions)
  if (
    analysisType === 'debut_appearance' ||
    analysisType === 'return_after_absence' ||
    analysisType === 'first_game_back_win' ||
    analysisType === 'bench_warmer_promoted'
  ) return 'appearances';

  // Game insights (game-level events: scores, team colors, dominance)
  if (
    analysisType === 'game_record' ||
    analysisType === 'blowout_game' ||
    analysisType === 'shutout_game' ||
    analysisType === 'team_color_loyalty' ||
    analysisType === 'team_color_switch' ||
    analysisType === 'low_scoring_game' ||
    analysisType === 'team_best_score' ||
    analysisType === 'team_color_dominance' ||
    analysisType === 'team_color_streak_broken' ||
    analysisType === 'player_color_curse'
  ) return 'game';

  // Milestone insights (personal achievements)
  if (
    analysisType.includes('milestone') ||
    analysisType.includes('personal_best')
  ) return 'milestones';

  return 'all';
};
```

**Card Styling by Priority:**
- Priority 1-2: `border-l-warning bg-warning/5`
- Priority 3-5: `border-l-primary bg-primary/5`
- Current user involved: `border-l-primary bg-primary/10 ring-1 ring-primary/30`

## WhatsApp Integration

The `get_whatsapp_summary` function generates a WhatsApp-formatted summary with up to **8 insights** for maximum variety.

### Selection Logic (Updated Jan 2026)

**Step 1: Priority 1 insights always shown first**
- Historic moments like `first_ever_win_nemesis` are never filtered out
- Up to 3 priority-1 insights can appear at the top

**Step 2: One insight per category for variety**
- Ensures diverse content rather than multiple similar insights
- Categories with no insights are skipped

**Step 3: Fill remaining slots by priority**
- Any remaining slots (up to 8 total) filled with highest-priority insights not yet shown

### Categories (10 total)

| Category | Insight Types | Notes |
|----------|---------------|-------|
| trophy | `trophy_change`, `trophy_new`, `trophy_extended`, `trophy_defended` | |
| rivalry | `rivalry_*`, `never_beaten_rivalry`, `first_ever_win_nemesis` | |
| chemistry | `chemistry_*`, `trio_*`, `partnership_*` | |
| attendance | `attendance_streak`, `attendance_streak_ended` | |
| streak | `win_streak`, `losing_streak`, `unbeaten_streak` (not attendance) | |
| record | `game_record`, `blowout_game`, `shutout_game` | |
| milestone | `cap_milestone`, `personal_best*` | |
| appearance | `debut_appearance`, `return_after_absence`, `first_game_back_win`, `bench_warmer_promoted` | |
| team_color | `team_color_loyalty`, `team_color_switch` | |
| injury | `injury_token_return` | Only returns are positive/celebratory |

**Excluded from WhatsApp:**
- `injury_token_used` - Informational only, not celebratory
- `chemistry_curse`, `trio_cursed` - Negative insights
- `losing_streak`, `winless_streak` - Negative insights
- `rivalry_nemesis` - Negative for the victim
- `player_color_curse` - Negative insight

### Example Output

```
🏟️ *WNF #78*: 🔵 Blue 3-0 Orange 🟠

📊 *Post-Match Analysis*

1. Revenge! Alex E beats Nathan after 5 straight losses
2. 10 wins together! Alex E & Chris
3. Iron man! Paul reaches 30 consecutive games
4. On fire! Simon wins 3 in a row
5. Clean sheet! Blue keeps opposition scoreless (3-0)
6. 💉 Back in action! Jack G returns from injury (streak: 12)
7. True Orange! Nathan has played Orange 70% of the time
8. On fire! Maddocks wins 3 in a row

🔗 Full report: https://wnf.app/results/78
```

This example shows 8 categories represented with good variety: rivalry, chemistry, attendance, streak, record (shutout), injury (return), and team_color.

## Bug Fixes

### rivalry_close Wording Fix (January 15, 2026)

**Problem:** The insight always said "edges ahead" regardless of the winner's actual H2H record.

**Example Bug:** "Phil R edges ahead vs Chris (12W-4D-14L)" - Phil has 12W and 14L, meaning Phil is BEHIND, not ahead.

**Fix:** Dynamic wording based on actual W/L comparison:
- If `v_wins > v_losses`: "extends lead vs"
- If `v_wins < v_losses`: "closes gap vs"
- If equal: "levels the series vs"

**Migration:** `20260115_fix_rivalry_close_wording.sql`

## Related Documentation

- [Public Game Results](PublicGameResults.md) - Where insights are displayed
- [Rivalry System](RivalrySystem.md) - Rivalry insight source data
- [Player Chemistry](PlayerChemistry.md) - Chemistry insight source data
- [Trio Chemistry](TrioChemistry.md) - Trio insight source data
- [Awards System](AwardsSystem.md) - Trophy insight source data
