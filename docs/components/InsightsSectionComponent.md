# InsightsSection Component

**Last Updated:** January 16, 2026
**Location:** `src/components/results/InsightsSection.tsx`
**Size:** ~700 lines (most complex results component)

## Purpose

Filterable post-match insights display with 8 category tabs and player filtering. Shows trophy changes, streaks, chemistry, rivalries, appearances, game events, and milestones with priority-based styling and confidence indicators.

## Features

- Collapsible section with insight count badge
- 8 category filter tabs with count badges
- Player filter dropdown (extracts players from insights)
- "My Insights" quick filter button (logged-in users)
- Priority-based card styling with medal colors for trophies
- Show more/less functionality (initially 12 insights)
- Confidence badges for percentage-based insights
- Dynamic confidence thresholds from database

## Filter Categories

| ID | Label | Short Label | Icon | Analysis Types |
|----|-------|-------------|------|---------------|
| `all` | All | All | Sparkles | All insights |
| `trophies` | Trophies | Trophy | Trophy | `trophy_*`, `award_*` |
| `streaks` | Streaks | Streak | Flame | `*streak*`, `team_streak`, `injury_token_used`, `injury_token_return` |
| `chemistry` | Chemistry | Chem | Users | `*chemistry*`, `*trio*`, `*partnership*` |
| `rivalries` | Rivalries | Rival | Swords | `*rivalry*`, `never_beaten_rivalry`, `first_ever_win_nemesis` |
| `appearances` | Appearances | Appear | UserPlus | `debut_appearance`, `return_after_absence`, `first_game_back_win`, `bench_warmer_promoted` |
| `game` | Game | Game | Gamepad2 | `game_record`, `blowout_game`, `shutout_game`, `team_color_*`, `low_scoring_game`, `team_best_score`, `player_color_curse` |
| `milestones` | Milestones | Miles | Target | `*milestone*`, `*personal_best*` |

**Note:** Categories with 0 insights are hidden from tabs (except "All").

## Confidence Badges

For percentage-based insights (chemistry, trios, rivalries), displays sample size with confidence level:

| Level | Badge Color | Meaning |
|-------|-------------|---------|
| High | `badge-success` (green) | Top third sample size for insight type |
| Med | `badge-warning` (yellow) | Middle third sample size |
| Low | `badge-error` (red) | Bottom third sample size |

**Dynamic thresholds** from `get_confidence_thresholds()` RPC:
- Thresholds calculated from actual data distribution (33rd/67th percentiles)
- Different thresholds per insight category (trio, chemistry, rivalry, other)
- Defaults: Low < 10 games, Med 10-20 games, High 20+ games

```typescript
const confidenceInfo = getConfidenceInfo(sampleSize, analysisType);
// Returns { label: 'High', color: 'badge-success', tooltip: '...' }
```

## Priority-Based Styling

| Condition | Border | Background | Notes |
|-----------|--------|------------|-------|
| User involved | `border-l-primary` | `bg-primary/10` | Also has `ring-1 ring-primary/30` |
| Trophy gold (1st) | `border-l-yellow-500` | `bg-yellow-500/10` | Medal position 1 |
| Trophy silver (2nd) | `border-l-gray-400` | `bg-gray-400/10` | Medal position 2 |
| Trophy bronze (3rd) | `border-l-amber-600` | `bg-amber-600/10` | Medal position 3 |
| Priority 1-2 | `border-l-warning` | `bg-warning/5` | High priority |
| Priority 3 | `border-l-primary` | `bg-primary/5` | Medium priority |
| Priority 4-5 | `border-l-base-300` | (none) | Low priority |

## Component Props

```typescript
interface InsightsSectionProps {
  insights: PostMatchInsight[];  // Insights from usePostMatchAnalysis
  loading?: boolean;             // Show skeleton loading state
  gamePlayers?: GamePlayer[];    // Optional player list for filter
  defaultExpanded?: boolean;     // Initial expand state (default: true)
}

interface GamePlayer {
  id: string;
  friendly_name: string;
}
```

## Usage

```tsx
import { InsightsSection } from '@/components/results/InsightsSection';

<InsightsSection
  insights={insights}
  loading={insightsLoading}
  gamePlayers={gamePlayers}
  defaultExpanded={true}
/>
```

## Player Filter System

Players are extracted from insight details automatically:

```typescript
// Keys checked for player IDs and names
const mappings = [
  ['player_id', 'player_name'],
  ['winner_id', 'winner_name'],
  ['loser_id', 'loser_name'],
  ['holder_id', 'holder_name'],
  ['player1_id', 'player1_name'],
  ['player2_id', 'player2_name'],
  ['player3_id', 'player3_name'],
];
```

**Filter controls:**
- "My Insights" button - Quick filter for current user's insights
- Player dropdown - Filter by any player mentioned in insights
- Active filter indicator with clear button

## Show More/Less Behavior

- Initial display: 12 insights (`INITIAL_DISPLAY_LIMIT`)
- When filters applied: Shows all filtered results
- "Show more" button reveals hidden insights
- "Show less" resets to initial limit (only when no filters)

## InsightCard Subcomponent

Each insight rendered as a card with:

1. **Icon/Emoji** - Medal for trophies, category emoji otherwise
2. **Headline** - Main insight text
3. **Stats Row** - WDL record and confidence badge (when applicable)
4. **Player Links** - Linked badges to player profiles
5. **Category Badge** - Small category label in corner

```typescript
interface InsightCardProps {
  insight: PostMatchInsight;
  index: number;
  currentPlayerId?: string;
  confidenceThresholds: Record<string, ConfidenceThreshold>;
}
```

## Medal Display

Trophy insights show medal icons instead of emojis:

```typescript
const getMedalIcon = (medalPosition: number | undefined): string => {
  switch (medalPosition) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
};
```

## Animation

Uses framer-motion for:
- Collapsible section expand/collapse
- Card layout animations (`layout` prop)
- Staggered card entrance (0.02s delay per card)
- Scale animation on enter/exit

## Responsive Design

| Element | Desktop | Mobile |
|---------|---------|--------|
| Filter tabs | Full labels | Short labels |
| Player filter | Full name visible | Icon only |
| "My Insights" button | Full text | "Mine" |
| Insight grid | 2 columns | 1 column |

## Dependencies

- `framer-motion` - Animations
- `lucide-react` - Icons
- `useUser` hook - Current player context
- `useAuth` hook - Auth context
- `useConfidenceThresholds` - Dynamic thresholds

## Related Documentation

- [Public Game Results](../features/PublicGameResults.md) - Parent feature
- [Post-Match Insights](../features/PostMatchInsights.md) - Insight types and generation
- [MatchSummary Component](MatchSummaryComponent.md) - Sibling component
- [Player Chemistry](../features/PlayerChemistry.md) - Chemistry insights
- [Rivalry System](../features/RivalrySystem.md) - Rivalry insights
