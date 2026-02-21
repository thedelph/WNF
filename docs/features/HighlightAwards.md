# Highlight Awards Voting

**Last Updated:** February 21, 2026
**Version:** 2.1.0

## Overview

The Highlight Awards system lets game participants vote for the best highlights in two categories:

| Award | Emoji | Eligible Highlights |
|-------|-------|---------------------|
| **Best Goal** | ⚽ | Goal highlights only |
| **Play of the Match** | ⭐ | All highlight types |

Voting follows the same 7-day window as MOTM voting. Winners receive badges on their highlight cards and are shown in a banner at the top of the highlights section.

## Database

### Table: `highlight_award_votes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `game_id` | UUID | FK → games(id) ON DELETE CASCADE |
| `voter_player_id` | UUID | FK → players(id) ON DELETE CASCADE |
| `highlight_id` | UUID | FK → game_highlights(id) ON DELETE CASCADE |
| `award_type` | TEXT | `'best_goal'` or `'play_of_the_match'` |
| `created_at` | TIMESTAMPTZ | Vote creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

**Constraints:**
- `UNIQUE(game_id, voter_player_id, award_type)` — one vote per player per award type per game
- `CHECK(award_type IN ('best_goal', 'play_of_the_match'))`

**Indexes:** `game_id`, `highlight_id`, `voter_player_id`

### RLS Policies

Same pattern as MOTM: public SELECT, participant INSERT/UPDATE/DELETE within 7-day window.

## Components

### HighlightAwardsBanner (`src/components/results/HighlightAwardsBanner.tsx`)

Compact banner shown at the top of HighlightsSection when awards have clear winners. Displays trophy icon for Best Goal and star icon for Play of the Match with amber-tinted badges and vote counts.

### HighlightAwardsVoting (`src/components/results/HighlightAwardsVoting.tsx`)

Inline voting UI at the bottom of HighlightsSection. Two collapsible sub-sections for each award type. Compact highlight cards with click-to-vote. User's vote highlighted with primary ring.

- **Best Goal** section only shows goal-type highlights
- **Play of the Match** shows all highlights
- Click same highlight = un-vote (delete)
- Click different highlight = upsert (switch)
- Hidden when no highlights exist

### HighlightCard Award Badges

Winning highlights get award badges in their card:
- 🏆 Best Goal — trophy icon, amber text
- ⭐ Play of the Match — star icon, amber text

## Hooks

### `useHighlightAwards(gameId, highlightIds, playerId)`

**Returns:** `bestGoalWinner`, `playOfMatchWinner`, `voteCounts`, `userVotes`, `isVotingOpen`, `castVote()`, `loading`

- Upsert with `onConflict: 'game_id,voter_player_id,award_type'`
- Click same highlight = delete (un-vote)
- Winners: highlight with max votes per award type, null if tie

## Types (in `src/types/highlights.ts`)

- `HighlightAwardType` — `'best_goal' | 'play_of_the_match'`
- `HIGHLIGHT_AWARD_TYPES` — Constant array with key, label, emoji, color, eligibleTypes
- `HighlightAwardVote` — Vote record
- `HighlightAwardWinner` — Winner summary (highlightId, awardType, voteCount)

## Integration Points

| Component | Integration |
|-----------|-------------|
| `HighlightsSection.tsx` | Wires `useHighlightAwards`, renders banner + voting + award badges |
| `GameDetail.tsx` | Passes `gameDate` prop to HighlightsSection for 7-day window |

## Edge Cases

- **No goal highlights:** Best Goal section hidden, only Play of the Match shown
- **No highlights at all:** Entire awards voting hidden
- **Highlight deleted after votes:** ON DELETE CASCADE
- **Tied votes:** No award badge, "Tied" in banner
- **Vote after 7 days:** RLS rejects → toast error
