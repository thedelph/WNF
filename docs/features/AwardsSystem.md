# Awards System (Hall of Fame)

**Last Updated:** January 7, 2026
**Version:** 1.0

## Overview

The Awards System recognizes player achievements through the Hall of Fame. Awards are given for yearly performance and all-time achievements, with Gold, Silver, and Bronze medals for the top 3 players in each category.

## Award Categories

There are **16 award categories** across individual, pair, and trio achievements:

### Individual Awards

| Category | ID | Description |
|----------|-----|-------------|
| XP Champion | `xp_champion` | Highest XP at year end |
| Win Rate Leader | `win_rate_leader` | Best win rate (min games required) |
| Net Positive | `net_positive` | Highest goal differential |
| Iron Man | `iron_man` | Most consecutive games attended |
| Hot Streak | `hot_streak` | Most consecutive wins |
| The Wall | `the_wall` | Best defense (fewest goals conceded per game) |
| Appearance King | `appearance_king` | Most games played |
| Blue Blood | `blue_blood` | Most games on Blue team |
| Dutch Master | `dutch_master` | Most games on Orange team |
| Super Sub | `super_sub` | Most reserve appearances promoted to play |

### Pair Awards (Chemistry)

| Category | ID | Description |
|----------|-----|-------------|
| Dynamic Duo | `dynamic_duo` | Best chemistry pair (highest win rate together) |
| Cursed Duos | `cursed_duos` | Worst chemistry pair (lowest win rate together) |
| Best Buddies | `best_buddies` | Most games played together |
| Fiercest Rivalry | `fiercest_rivalry` | Most lopsided head-to-head record |

### Trio Awards

| Category | ID | Description |
|----------|-----|-------------|
| Dream Team Trio | `dream_team_trio` | Best performing 3-player combination |
| Cursed Trio | `cursed_trio` | Worst performing 3-player combination |

## Medal Types

Each award category has three medal positions:

```typescript
type MedalType = 'gold' | 'silver' | 'bronze';
```

- **Gold**: 1st place
- **Silver**: 2nd place
- **Bronze**: 3rd place

## Data Types

### Award

```typescript
interface Award {
  id: string;
  playerId: string;
  playerName: string;
  category: AwardCategory;
  medalType: MedalType;
  year: number | null;     // null for all-time awards
  value: number;
  partnerId?: string;      // For pair awards
  partnerName?: string;
  partner2Id?: string;     // For trio awards
  partner2Name?: string;
  awardedAt: string;
}
```

### PlayerTrophy

Used for a player's trophy cabinet:

```typescript
interface PlayerTrophy {
  id: string;
  category: AwardCategory;
  medalType: MedalType;
  year: number | null;
  value: number;
  partnerId?: string;
  partnerName?: string;
  partner2Id?: string;
  partner2Name?: string;
  awardedAt: string;
}
```

### TrophyCounts

```typescript
interface TrophyCounts {
  total: number;
  gold: number;
  silver: number;
  bronze: number;
}
```

### AwardCategoryConfig

Display configuration for each category:

```typescript
interface AwardCategoryConfig {
  id: AwardCategory;
  title: string;
  description: string;
  icon: string;              // Lucide icon name
  color: string;             // Tailwind color class
  valueFormatter: (value: number) => string;
  isPairAward: boolean;
  isTrioAward?: boolean;
}
```

## Award Calculation

Awards are calculated and stored in the database. The calculation considers:

### Individual Awards

- **XP Champion**: Max XP value at year end
- **Win Rate Leader**: Highest win percentage (min 10 games)
- **Iron Man**: Longest consecutive game streak
- **Hot Streak**: Longest winning streak
- **Appearance King**: Total games played

### Pair Awards

- **Dynamic Duo**: Highest chemistry score
- **Cursed Duos**: Lowest chemistry score
- **Best Buddies**: Most games together on same team
- **Fiercest Rivalry**: Highest rivalry score (most lopsided H2H)

### Trio Awards

- **Dream Team Trio**: Highest trio chemistry score
- **Cursed Trio**: Highest curse score (lowest performance rate)

## UI Components

### AwardCategory

Displays awards for a specific category with podium:

**Location:** `src/components/awards/AwardCategory.tsx`

### AwardPodium

Displays gold/silver/bronze winners:

**Location:** `src/components/awards/AwardPodium.tsx`

### TrophyCabinet

Displays a player's trophy collection:

**Location:** `src/components/profile/TrophyCabinet.tsx`

## Pages

### Hall of Fame

Main awards page showing all categories:

**Location:** `src/pages/HallOfFame.tsx`

Features:
- Year filter (specific year or all-time)
- Grouped by category
- Live calculations for all-time view

## Year Filters

Awards support filtering by:
- **Specific year**: Awards earned in that calendar year
- **All-time**: Awards calculated from all historical data

```typescript
type AwardYearFilter = number | 'all';
```

## Database Schema

### awards Table

```sql
CREATE TABLE awards (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  award_category TEXT NOT NULL,
  medal_type TEXT NOT NULL,
  award_year INTEGER,         -- NULL for all-time
  value DECIMAL NOT NULL,
  partner_id UUID,            -- For pair awards
  partner2_id UUID,           -- For trio awards
  awarded_at TIMESTAMPTZ DEFAULT now()
);
```

## Related Documentation

- [Player Chemistry](/docs/features/PlayerChemistry.md) - Pair chemistry (Dynamic Duo, Cursed Duos)
- [Rivalry System](/docs/features/RivalrySystem.md) - Head-to-head (Fiercest Rivalry)
- [Trio Chemistry](/docs/features/TrioChemistry.md) - Trio awards (Dream Team, Cursed Trio)
- [XP System v2](/docs/features/XPSystemv2.md) - XP Champion calculations
