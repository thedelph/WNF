# Public Game Results

**Last Updated:** January 22, 2026
**Version:** 2.1.0

## Overview

The Public Game Results feature allows users to browse completed WNF games through a public-facing interface. It provides:

1. **Results List Page** (`/results`) - Paginated list with year, outcome, and participation filters
2. **Game Detail Page** (`/results/:sequenceNumber`) - Sky Sports-style match report with insights, team sheets, and WhatsApp summary

Key design decisions:
- Uses `sequence_number` for URLs (user-friendly: WNF #247 vs UUID)
- Public read access - anyone can view completed games
- Login incentives encourage registration through locked features

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/results` | `Results.tsx` | Paginated game list with filters |
| `/results/:sequenceNumber` | `GameDetail.tsx` | Individual game match report |

## Features

### 1. Results List (`/results`)

The results page displays completed games in a responsive card grid with multiple filter options.

**Filters:**
- **Year** - All years or specific year (uses YearSelector component)
- **Outcome** - Blue Win, Orange Win, Draw, or user-centric My Win/My Loss
- **Participation** - All, Played, Reserve (login required)

**User-Centric Outcomes:**
When logged in and filtering by "Played" games, users see personalized outcome filters:
- "My Wins" - Games where user's team won
- "My Losses" - Games where user's team lost
- "Draws" - Draw games the user played in

**Pagination:**
- 20 games per page (PAGE_SIZE constant)
- Desktop: First/Prev/Page indicator/Next/Last buttons
- Mobile: "Load More" button for infinite scroll

### 2. Game Detail (`/results/:sequenceNumber`)

The detail page presents a comprehensive match report with:

1. **ScoreHero** - Large animated score display with team colors
2. **Metadata Row** - Date, venue, player count, insights count
3. **Team Rosters** - Collapsible blue/orange team lists with reserves
4. **MOTM Voting** - Man of the Match voting section (see [MotmVoting](MotmVoting.md))
5. **Highlights** - Video highlights with award badges (see [HighlightAwards](HighlightAwards.md))
6. **Match Summary** - Numbered WhatsApp summary highlights
7. **Post-Match Insights** - Filterable insights by category

**Auto-Generation:** If a completed game has no insights yet, they are generated on-demand when visiting the detail page.

## Login Incentives

The feature integrates with the Login Incentives System:

| Feature | Logged Out | Logged In |
|---------|------------|-----------|
| Participation filter | Locked (LockedContent) | Available |
| User-centric outcomes | Hidden | Shown when filtering "Played" |
| "You played" badges | Hidden | Shown on cards |
| Roster highlighting | None | Current user highlighted |
| "My Insights" filter | Hidden | Available |

## Data Types

### GameResultsFilters

```typescript
interface GameResultsFilters {
  year: number | 'all';
  outcome: '' | 'blue_win' | 'orange_win' | 'draw' | 'my_win' | 'my_loss';
  participation: 'all' | 'played' | 'reserve';
}
```

### GameResultItem

```typescript
interface GameResultItem {
  id: string;
  sequence_number: number;
  date: string;
  score_blue: number | null;
  score_orange: number | null;
  outcome: 'blue_win' | 'orange_win' | 'draw' | null;
  venue?: { name: string };
  user_team?: 'blue' | 'orange' | null;    // User's team if they played
  user_status?: 'selected' | 'reserve' | null;  // User's participation status
}
```

### GameDetail

```typescript
interface GameDetail {
  id: string;
  date: string;
  sequence_number: number;
  score_blue: number | null;
  score_orange: number | null;
  outcome: 'blue_win' | 'orange_win' | 'draw' | null;
  status: string;
  venue?: {
    id: string;
    name: string;
    address?: string;
    google_maps_url?: string;
  };
  game_registrations: GameDetailRegistration[];
}
```

### GameDetailRegistration

```typescript
interface GameDetailRegistration {
  id: string;
  status: 'selected' | 'reserve' | 'registered' | 'dropped_out' | 'absent';
  team: 'blue' | 'orange' | null;
  selection_method?: string;
  player: GameDetailPlayer;
}

interface GameDetailPlayer {
  id: string;
  friendly_name: string;
  avatar_svg?: string;
  caps?: number;
}
```

## React Hooks

### useGameResults

**Location:** `src/hooks/useGameResults.ts`

Fetches paginated game results with filtering support.

```typescript
const {
  games,          // GameResultItem[]
  loading,        // boolean
  error,          // string | null
  totalCount,     // number
  currentPage,    // number
  setCurrentPage, // (page: number) => void
  totalPages,     // number
  hasMore,        // boolean
  loadMore,       // () => void
} = useGameResults(filters, playerId);
```

**Parameters:**
- `filters: GameResultsFilters` - Current filter state
- `playerId: string | null` - Current user's player ID (for participation filtering)

**Implementation Notes:**
- Server-side filtering for year and team-centric outcomes (blue_win, orange_win, draw)
- Client-side filtering for user-centric outcomes (my_win, my_loss) and participation status
- Resets to page 1 when filters change

### useGameDetail

**Location:** `src/hooks/useGameDetail.ts`

Fetches a single game by sequence number with derived team data.

```typescript
const {
  game,        // GameDetail | null
  loading,     // boolean
  error,       // string | null
  blueTeam,    // GameDetailRegistration[]
  orangeTeam,  // GameDetailRegistration[]
  reserves,    // GameDetailRegistration[]
  refetch,     // () => Promise<void>
} = useGameDetail(sequenceNumber);
```

**Parameters:**
- `sequenceNumber: string | undefined` - The WNF sequence number from URL

**Derived Data:**
- `blueTeam` - Registrations with `team === 'blue'` and `status === 'selected'`
- `orangeTeam` - Registrations with `team === 'orange'` and `status === 'selected'`
- `reserves` - Registrations with `status === 'reserve'`

## UI Components

### ResultCard

**Location:** `src/components/results/ResultCard.tsx`

Displays a single game in the results grid.

**Features:**
- WNF sequence number as title
- Date and venue display
- Score display with team colors
- Outcome badge (Blue Win/Orange Win/Draw)
- User participation highlighting (ring style + badge)
- Links to game detail page

**Highlighting:**
- Played games: `ring-2 ring-primary/30 bg-primary/5` + "You played" badge
- Reserve games: `ring-2 ring-warning/30 bg-warning/5` + "Reserve" badge

### ScoreHero

**Location:** `src/components/results/ScoreHero.tsx`

Sky Sports-style large score display.

**Features:**
- Animated score entrance (framer-motion)
- Team labels with colors (Blue/Orange)
- Winner badge on winning team
- Draw badge when tied
- "Score not recorded" fallback
- Responsive sizing: `text-5xl md:text-7xl lg:text-8xl`

### MatchSummary

**Location:** `src/components/results/MatchSummary.tsx`

Displays WhatsApp summary highlights as numbered cards with contextual emojis.

**Features:**
- Parses numbered format (1. highlight, 2. highlight, etc.)
- Contextual emoji mapping (~40 keywords organized by category)
- Highlights current user's name in primary color
- "You" badge on cards mentioning current user
- Collapsible section with highlight count badge
- Animated card entrance (framer-motion)

**Emoji Categories:**
| Category | Example Keywords | Emoji |
|----------|-----------------|-------|
| Trophy | gold, silver, bronze, champion | 🥇🥈🥉🏆 |
| Streak | on fire, in a row, streak ended, drought | 🔥💔🛡️🏜️ |
| Chemistry | together, cursed, dream team | 🤝💀👑 |
| Rivalry | nemesis, rivalry, revenge | 😈⚔️🎯 |
| Game | goal fest, nail-biter, clean sheet | ⚽😬🧤 |
| Appearance | debut, welcome back, iron man | ⭐👋🏃 |
| Team Color | blue dominance, orange dominance | 💙🧡 |
| Milestone | milestone, century, reaches | 🎖️💯 |

See: [MatchSummary Component](../components/MatchSummaryComponent.md) for full emoji mapping

### TeamRoster

**Location:** `src/components/results/TeamRoster.tsx`

Collapsible team sheets for Blue, Orange, and Reserve players.

**Features:**
- Collapsible header with player count badge
- Player avatars with fallback initials
- Links to player profiles
- Current user highlighting with "You" badge
- Team color theming for hover states
- Reserves displayed as badge tags

### InsightsSection

**Location:** `src/components/results/InsightsSection.tsx`

Filterable post-match insights display with 8 category tabs.

**Features:**
- Collapsible section with insight count badge
- 8 category filter tabs with count badges
- Player filter dropdown
- "My Insights" quick filter button (logged-in users)
- Priority-based card styling with medal colors for trophies
- Show more/less functionality (initially 12 insights)
- Confidence badges for percentage-based insights
- Dynamic confidence thresholds from database

**Filter Categories (8 tabs):**
| ID | Label | Icon | Analysis Types |
|----|-------|------|---------------|
| `all` | All | Sparkles | All insights |
| `trophies` | Trophies | Trophy | `trophy_*`, `award_*` |
| `streaks` | Streaks | Flame | `*streak*`, `team_streak`, `injury_token_*` |
| `chemistry` | Chemistry | Users | `*chemistry*`, `*trio*`, `*partnership*` |
| `rivalries` | Rivalries | Swords | `*rivalry*`, `never_beaten_rivalry`, `first_ever_win_nemesis` |
| `appearances` | Appearances | UserPlus | `debut_appearance`, `return_after_absence`, `first_game_back_win`, `bench_warmer_promoted` |
| `game` | Game | Gamepad2 | `game_record`, `blowout_game`, `shutout_game`, `team_color_loyalty`, `team_color_switch`, `team_color_dominance`, `team_color_streak_broken`, `low_scoring_game`, `team_best_score`, `player_color_curse` |
| `milestones` | Milestones | Target | `*milestone*`, `*personal_best*` |

**Confidence Badges:**
For percentage-based insights (chemistry, rivalries, team color stats):
- **High** (green badge) - Top third sample size for the insight type
- **Med** (yellow badge) - Middle third sample size
- **Low** (red badge) - Bottom third sample size

Thresholds are dynamic, calculated from `get_confidence_thresholds()` RPC based on actual data distribution (33rd/67th percentiles).

**Priority-Based Styling:**
| Condition | Border | Background |
|-----------|--------|------------|
| User involved | primary | primary/10 + ring |
| Trophy gold (1st) | yellow-500 | yellow-500/10 |
| Trophy silver (2nd) | gray-400 | gray-400/10 |
| Trophy bronze (3rd) | amber-600 | amber-600/10 |
| Priority 1-2 | warning | warning/5 |
| Priority 3 | primary | primary/5 |
| Priority 4-5 | base-300 | (none) |

See: [InsightsSection Component](../components/InsightsSectionComponent.md) for detailed implementation

## Responsive Design

| Element | Desktop | Mobile |
|---------|---------|--------|
| Results grid | 3 columns | 1 column |
| Pagination | Button bar | Load More button |
| Score hero | `text-8xl` | `text-5xl` |
| Team rosters | Side-by-side grid | Stacked |
| Filter tabs | Full labels | Short labels |
| Player filter | Full name | Icon only |

## Files Created

| File | Purpose |
|------|---------|
| `src/pages/Results.tsx` | Results list page |
| `src/pages/GameDetail.tsx` | Game detail page |
| `src/hooks/useGameResults.ts` | Results fetching hook |
| `src/hooks/useGameDetail.ts` | Game detail hook |
| `src/components/results/ResultCard.tsx` | Game list card |
| `src/components/results/ScoreHero.tsx` | Large score display |
| `src/components/results/MatchSummary.tsx` | WhatsApp highlights |
| `src/components/results/TeamRoster.tsx` | Team sheets |
| `src/components/results/InsightsSection.tsx` | Insights display |

## Related Documentation

- [Login Incentives System](LoginIncentivesSystem.md) - LockedContent and user highlighting
- [Post-Match Insights](PostMatchInsights.md) - Insight generation and types
- [Rivalry System](RivalrySystem.md) - Rivalry insights
- [Player Chemistry](PlayerChemistry.md) - Chemistry insights
