# MatchSummary Component

**Last Updated:** January 22, 2026
**Location:** `src/components/results/MatchSummary.tsx`
**Size:** ~208 lines

## Purpose

Displays WhatsApp-formatted match summaries with contextual emojis and user highlighting. Parses numbered highlight lines and renders them as interactive cards with automatic emoji assignment based on content keywords.

## Features

- Parses numbered format (1. highlight, 2. highlight, etc.)
- Contextual emoji mapping (~40 keywords)
- Current user's name highlighted in primary color
- "You" badge on cards mentioning current user
- Collapsible section with highlight count badge
- Animated card entrance (framer-motion)
- Whole-word regex matching (case-insensitive)

## Emoji Mapping System

The component automatically assigns emojis to highlights based on keyword detection. Keywords are checked in order - first match wins.

### Trophy Keywords

| Keywords | Emoji | Description |
|----------|-------|-------------|
| `gold`, `takes gold` | 🥇 | Gold medal achievement |
| `silver`, `takes silver` | 🥈 | Silver medal achievement |
| `bronze`, `takes bronze` | 🥉 | Bronze medal achievement |
| `trophy`, `champion` | 🏆 | Trophy/championship |

### Streak Keywords

| Keywords | Emoji | Description |
|----------|-------|-------------|
| `streak ended`, `run broken` | 💔 | Streak broken |
| `on fire`, `in a row`, `wins straight` | 🔥 | Hot streak |
| `unbeaten` | 🛡️ | Unbeaten run |
| `finally`, `ends` + `losing` | 🎉 | Positive streak end |
| `drought`, `winless` | 🏜️ | Losing drought |

### Chemistry Keywords

| Keywords | Emoji | Description |
|----------|-------|-------------|
| `chemistry`, `together` | 🤝 | Partnership synergy |
| `cursed`, `curse` | 💀 | Cursed partnership |
| `dream team`, `trio` | 👑 | Dream team |

### Rivalry Keywords

| Keywords | Emoji | Description |
|----------|-------|-------------|
| `nemesis`, `dominates` | 😈 | Nemesis domination |
| `rivalry`, `vs` | ⚔️ | Rivalry matchup |
| `revenge`, `first time ever`, `historic` | 🎯 | Historic moment |
| `never beaten`, `can they ever` | 😰 | Never beaten stats |

### Game Record Keywords

| Keywords | Emoji | Description |
|----------|-------|-------------|
| `goal fest`, `goals` | ⚽ | High-scoring game |
| `nail-biter`, `single goal` | 😬 | Close game |
| `blowout`, `demolish` | 💥 | Blowout win |
| `clean sheet`, `scoreless` | 🧤 | Clean sheet |
| `defensive battle`, `low scoring` | 🧱 | Low-scoring game |

### Appearance Keywords

| Keywords | Emoji | Description |
|----------|-------|-------------|
| `debut`, `first game` | ⭐ | First appearance |
| `welcome back`, `returns after` | 👋 | Return after absence |
| `comeback`, `triumphant return` | 💪 | Comeback |
| `iron man`, `consecutive games` | 🏃 | Attendance streak |

### Team Color Keywords

| Keywords | Emoji | Description |
|----------|-------|-------------|
| `blue dominance`, `true blue` | 💙 | Blue team stats |
| `orange dominance`, `true orange` | 🧡 | Orange team stats |
| `color curse` | 🎭 | Color curse |

### Milestone Keywords

| Keywords | Emoji | Description |
|----------|-------|-------------|
| `milestone`, `reaches`, `caps` | 🎖️ | Milestone reached |
| `century`, `100` | 💯 | 100+ milestone |

### Default

| Condition | Emoji |
|-----------|-------|
| No keyword match | 📊 |

## User Highlighting

The component highlights mentions of the current logged-in user:

```typescript
// Creates regex for whole-word matching
const regex = new RegExp(`\\b(${playerName})\\b`, 'gi');

// Highlighted text styling
<span className="font-semibold text-primary">{name}</span>

// Card styling when user mentioned
className="bg-primary/10 ring-1 ring-primary/30"

// "You" badge shown
<span className="badge badge-xs badge-primary">You</span>
```

## Component Props

```typescript
interface MatchSummaryProps {
  summary: string;           // Raw WhatsApp summary text
  defaultExpanded?: boolean; // Initial expand state (default: true)
}
```

## Usage

```tsx
import { MatchSummary } from '@/components/results/MatchSummary';

<MatchSummary
  summary={game.whatsapp_summary}
  defaultExpanded={true}
/>
```

## Parsing Logic

The component parses numbered items from the summary text:

```typescript
// Regex matches: "1. Some highlight text"
const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
```

Each parsed highlight becomes an object:
```typescript
{
  number: 1,
  text: "Phil R takes gold for Appearance King",
  emoji: "🥇"  // Auto-assigned from keyword detection
}
```

## Collapsible Behavior

- Default expanded state controlled by `defaultExpanded` prop
- Header shows "Match Summary" with highlight count badge
- Framer-motion animations for smooth expand/collapse
- Chevron icon indicates expand state

## Related Documentation

- [Public Game Results](../features/PublicGameResults.md) - Parent feature
- [Post-Match Insights](../features/PostMatchInsights.md) - Insight generation
- [InsightsSection Component](InsightsSectionComponent.md) - Sibling component
