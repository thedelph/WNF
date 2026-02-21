# Man of the Match (MOTM) Voting

**Last Updated:** February 21, 2026
**Version:** 2.1.0

## Overview

The MOTM voting system allows game participants to vote for their Man of the Match after each completed game. Voting is open for 7 days after game completion, with results displayed on game detail pages, result cards, player profiles, and the leaderboard.

Key design decisions:
- Available on **all completed games** (not gated on YouTube URL)
- **7-day voting window** after game completion
- Only game participants (status `selected`) can vote
- Players cannot vote for themselves (enforced by DB constraint + UI)
- One vote per player per game (upsert pattern allows vote changes)
- Tied votes result in no winner

## Database

### Table: `motm_votes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `game_id` | UUID | FK → games(id) ON DELETE CASCADE |
| `voter_player_id` | UUID | FK → players(id) ON DELETE CASCADE |
| `voted_for_player_id` | UUID | FK → players(id) ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | Vote creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

**Constraints:**
- `UNIQUE(game_id, voter_player_id)` — one vote per player per game
- `CHECK(voter_player_id != voted_for_player_id)` — no self-voting

**Indexes:** `game_id`, `voter_player_id`, `voted_for_player_id`

### RLS Policies

| Policy | Access | Condition |
|--------|--------|-----------|
| SELECT | Anyone | Public read |
| INSERT | Authenticated | Own voter_player_id, participant in game, game within 7 days |
| UPDATE | Authenticated | Own vote, within 7 days |
| DELETE | Authenticated | Own vote, within 7 days |

### RPCs

| Function | Purpose |
|----------|---------|
| `get_motm_winners_batch(p_game_ids UUID[])` | Batch fetch MOTM winners for ResultCard list. Returns winner per game (excludes ties). |
| `get_motm_leaderboard(p_limit INT)` | Top players by MOTM wins for leaderboard |
| `get_player_motm_stats(p_player_id UUID)` | Individual player MOTM stats for profile |

## Components

### MotmVotingSection (`src/components/results/MotmVotingSection.tsx`)

Collapsible section on the GameDetail page. Shows between Team Rosters and Login Prompt for all completed games.

**Props:** `gameId`, `gameDate`, `registrations`

**UI States:**
1. **Can vote, hasn't voted** — Player grid grouped by Blue/Orange team columns. Self is grayed out. Click to vote.
2. **Can vote, has voted** — Results ranked list with progress bars + compact vote-switch grid below.
3. **Voting closed / non-participant** — Results-only view with crown on winner.
4. **No votes** — Empty state with crown icon.

**Sub-components:**
- `VotingGrid` — Two-column team grid for selecting a player. Supports `compact` mode for vote-switching.

### ResultCard Integration (`src/components/results/ResultCard.tsx`)

MOTM badge shown after outcome badge:
```tsx
<Crown className="w-3 h-3" /> MOTM: {friendly_name}
```
- Mobile: first name only
- Desktop: full name
- Amber-tinted badge styling

### StatsGrid Integration (`src/components/profile/StatsGrid.tsx`)

MOTM count shown when > 0:
- Label: "MOTM Awards"
- Value: crown emoji + count
- Tooltip with total awards

### LiveStatsTab Integration (`src/components/leaderboards/LiveStatsTab.tsx`)

"MOTM Leaders" AwardCard with Crown icon in amber color.

## Hooks

### `useMotmVotes(gameId, gameDate, playerId)`

Core voting hook. Uses upsert pattern from `useGoalDisputes` and optimistic updates from `useHighlightReactions`.

**Returns:** `votes`, `winner`, `voteCounts`, `userVote`, `totalVotes`, `isVotingOpen`, `castVote()`, `removeVote()`, `loading`

**Winner computation:** Player with most votes via `useMemo`. Returns `null` if tied.

### `usePlayerMotmStats(playerId)`

Calls `get_player_motm_stats` RPC. Returns `motmWins`, `totalVotesReceived`, `gamesVotedIn`.

### `useMotmLeaderboard(limit)`

Calls `get_motm_leaderboard` RPC. Returns array of `{ playerId, playerName, motmCount }`.

## Types (`src/types/motm.ts`)

- `MotmVote` — Full vote record with voter/voted_for player joins
- `MotmWinner` — Winner summary (playerId, playerName, avatarSvg, voteCount)
- `MotmVoteCounts` — `Record<string, number>` (playerId → count)

## Patterns Used

| Pattern | Source |
|---------|--------|
| Upsert voting | `useGoalDisputes.ts` |
| Optimistic updates | `useHighlightReactions.ts` |
| Participant check | `useIsGameParticipant.ts` |
| Collapsible section | `HighlightsSection.tsx` |
| Batch RPC fetch | `get_motm_winners_batch` for ResultCard list |
| AwardCard leaderboard | `AwardCard.tsx` |

## Edge Cases

- **< 2 participants:** Section hidden
- **Tied votes:** No winner, "Tied" message shown
- **Self-vote:** Button disabled + CHECK constraint
- **Vote after 7 days:** RLS rejects → toast error
- **Deleted player:** ON DELETE CASCADE
- **Vote change:** Upsert overwrites previous vote
